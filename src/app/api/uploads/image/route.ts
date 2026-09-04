import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { sanitizeAndProcessImage, uploadSanitizedImageToStorage, MAX_IMAGE_FILE_SIZE } from '@/lib/utils/imageUpload';

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
            { success: false, error: 'Siz faqat o‘zingiz yaratgan asar muqovasini o‘zgartira olasiz' },
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
      type: type === 'avatar' ? 'avatar' : 'cover',
    });

    if (!validation.isValid || !validation.sanitizedBuffer) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Yaroqsiz rasm formati' },
        { status: 400 },
      );
    }

    // Upload sanitized WebP to permanent public bucket
    const targetBucket = type === 'avatar' ? 'avatars' : 'work-covers';
    const folderPrefix = profile.id;

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
