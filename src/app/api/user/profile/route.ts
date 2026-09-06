import { NextResponse } from 'next/server';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { validateAndSanitizeSocialLinks } from '@/lib/utils/social';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('*')
      .eq('id', profile.id)
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });
  } catch (err: unknown) {
    console.error('Error fetching profile:', err);
    return NextResponse.json({ success: false, error: 'Xatolik yuz berdi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const profile = await getCurrentProfile(request.headers.get('Authorization'));
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.display_name !== undefined) {
      const name = String(body.display_name).trim();
      if (!name) {
        return NextResponse.json({ success: false, error: 'Ism bo‘sh bo‘lishi mumkin emas' }, { status: 400 });
      }
      updates.display_name = name.slice(0, 100);
    }

    if (body.username !== undefined) {
      const rawUser = String(body.username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (rawUser.length < 3) {
        return NextResponse.json(
          { success: false, error: 'Username kamida 3 ta belgidan iborat bo‘lishi kerak' },
          { status: 400 }
        );
      }

      // Check unique username if changing
      if (rawUser !== profile.username) {
        const admin = createAdminClient();
        const { data: existing } = await admin
          .from('profiles')
          .select('id')
          .eq('username', rawUser)
          .neq('id', profile.id)
          .maybeSingle();

        if (existing) {
          return NextResponse.json(
            { success: false, error: 'Ushbu username allaqachon band qilingan' },
            { status: 400 }
          );
        }
      }
      updates.username = rawUser;
    }

    if (body.bio !== undefined) {
      updates.bio = body.bio ? String(body.bio).trim().slice(0, 500) : null;
    }

    if (body.telegram_username !== undefined) {
      const tg = body.telegram_username
        ? String(body.telegram_username).trim().replace(/^@/, '').replace(/[^a-zA-Z0-9_]/g, '')
        : null;
      updates.telegram_username = tg ? tg.slice(0, 50) : null;
    }

    if (body.notification_preferences !== undefined) {
      updates.notification_preferences = body.notification_preferences;
    }

    if (body.social_links !== undefined) {
      if (typeof body.social_links !== 'object' || body.social_links === null) {
        return NextResponse.json(
          { success: false, error: 'Ijtimoiy tarmoqlar formati noto‘g‘ri' },
          { status: 400 }
        );
      }

      const validation = validateAndSanitizeSocialLinks(body.social_links);
      if (!validation.valid) {
        const firstError = Object.values(validation.errors)[0] || 'Ijtimoiy tarmoq havolalarida xatolik bor';
        return NextResponse.json(
          { success: false, error: firstError, errors: validation.errors },
          { status: 400 }
        );
      }

      updates.social_links = validation.links;

      if (validation.links.telegram) {
        const tgHandle = validation.links.telegram.replace('https://t.me/', '');
        updates.telegram_username = tgHandle;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'Hech qanday o‘zgarish yuborilmadi' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    const { data: updated, error: updateError } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (err: unknown) {
    console.error('Error updating profile:', err);
    return NextResponse.json({ success: false, error: 'Xatolik yuz berdi' }, { status: 500 });
  }
}
