import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import {
  sanitizeAndProcessImage,
  uploadSanitizedImageToStorage,
  MAX_IMAGE_FILE_SIZE,
} from '@/lib/utils/imageUpload';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Fayl yuklash uchun avval tizimga kiring' },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'cover';
    const workId = formData.get('workId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Hech qanday rasm fayli tanlanmadi' },
        { status: 400 },
      );
    }

    if (file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Rasm hajmi 5 MB dan oshmasligi kerak' },
        { status: 400 },
      );
    }

    // Permission checks
    const adminClient = createAdminClient();

    if (type === 'chapter') {
      if (!profile.is_admin) {
        return NextResponse.json(
          { success: false, error: 'Bob ichiga rasm joylash faqat administrator uchun ochiq' },
          { status: 403 },
        );
      }
      if (!workId) {
        return NextResponse.json(
          { success: false, error: 'Asar identifikatori talab qilinadi' },
          { status: 400 },
        );
      }
      const { data: work } = await adminClient
        .from('works')
        .select('id')
        .eq('id', workId)
        .maybeSingle();
      if (!work) {
        return NextResponse.json({ success: false, error: 'Asar topilmadi' }, { status: 404 });
      }
    }

    if (type === 'cover') {
      // Must be an author
      const { data: authorData } = await adminClient
        .from('author_profiles')
        .select('status')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (!authorData || authorData.status !== 'approved') {
        return NextResponse.json(
          { success: false, error: 'Muqova yuklash uchun mualliflik maqomi talab qilinadi' },
          { status: 403 },
        );
      }

      if (workId) {
        // Verify ownership of the work
        const { data: work } = await adminClient
          .from('works')
          .select('id, author_id')
          .eq('id', workId)
          .single();

        if (!work || work.author_id !== profile.id) {
          return NextResponse.json(
            {
              success: false,
              error: 'Siz faqat o‘zingiz yaratgan asar muqovasini o‘zgartira olasiz',
            },
            { status: 403 },
          );
        }
      }
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes, strip EXIF, normalize to WebP
    const validation = await sanitizeAndProcessImage(buffer, {
      type: type === 'avatar' ? 'avatar' : type === 'chapter' ? 'chapter' : 'cover',
    });

    if (!validation.isValid || !validation.sanitizedBuffer) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Yaroqsiz rasm formati' },
        { status: 400 },
      );
    }

    // Upload sanitized WebP to permanent public bucket
    const targetBucket = type === 'avatar' ? 'avatars' : 'work-covers';
    const folderPrefix = type === 'chapter' ? `${profile.id}/chapter-content` : profile.id;

    const uploadResult = await uploadSanitizedImageToStorage(
      validation.sanitizedBuffer,
      targetBucket,
      folderPrefix,
    );

    if (!uploadResult.success || !uploadResult.publicUrl) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Rasmni saqlashda xatolik yuz berdi' },
        { status: 500 },
      );
    }

    // Automatically update work or profile if IDs provided, cleaning up previous file
    if (type === 'cover' && workId) {
      const { data: existingWork } = await adminClient
        .from('works')
        .select('cover_url')
        .eq('id', workId)
        .maybeSingle();

      if (existingWork?.cover_url && existingWork.cover_url.includes('/work-covers/')) {
        try {
          const oldPath = existingWork.cover_url.split('/work-covers/')[1]?.split('?')[0];
          if (oldPath) {
            await adminClient.storage.from('work-covers').remove([oldPath]);
          }
        } catch {
          // ignore non-critical cleanup error
        }
      }

      await adminClient
        .from('works')
        .update({ cover_url: uploadResult.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', workId)
        .eq('author_id', profile.id);
    } else if (type === 'avatar') {
      if (profile.avatar_url && profile.avatar_url.includes('/avatars/')) {
        try {
          const oldPath = profile.avatar_url.split('/avatars/')[1]?.split('?')[0];
          if (oldPath) {
            await adminClient.storage.from('avatars').remove([oldPath]);
          }
        } catch {
          // ignore non-critical cleanup error
        }
      }

      await adminClient
        .from('profiles')
        .update({ avatar_url: uploadResult.publicUrl, updated_at: new Date().toISOString() })
        .eq('id', profile.id);

      revalidateTag('public-catalogue');
      revalidatePath('/');
      revalidatePath('/asarlar');
      revalidatePath('/hikoyalar');
      revalidatePath('/mualliflar');
      revalidatePath(`/mualliflar/${profile.username}`);
    }

    return NextResponse.json({
      success: true,
      publicUrl: uploadResult.publicUrl,
    });
  } catch (err: any) {
    console.error('Upload route error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Serverda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Faqat administrator uchun' },
        { status: 403 },
      );
    }
    const { publicUrl } = await request.json();
    if (typeof publicUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Rasm manzili talab qilinadi' },
        { status: 400 },
      );
    }
    const marker = '/work-covers/';
    const path = publicUrl.includes(marker) ? publicUrl.split(marker)[1]?.split('?')[0] : null;
    const allowedPrefix = `${profile.id}/chapter-content/`;
    if (!path || !path.startsWith(allowedPrefix) || !path.endsWith('.webp')) {
      return NextResponse.json(
        { success: false, error: 'Ushbu rasmni o‘chirish mumkin emas' },
        { status: 403 },
      );
    }
    const adminClient = createAdminClient();
    const { error } = await adminClient.storage.from('work-covers').remove([path]);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Rasmni o‘chirishda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
