import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const allowed = new Set(['page_view', 'work_view', 'chapter_start', 'chapter_complete', 'signup_gate']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!allowed.has(body.eventType) || !/^[0-9a-f-]{36}$/i.test(body.sessionId || '')) {
      return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 });
    }
    // Only registered work views need identity. Anonymous page/chapter analytics
    // are session-based, so avoid an Auth + profile round-trip for every event.
    const profile = body.eventType === 'work_view'
      ? await getCurrentProfile(req.headers.get('Authorization'))
      : null;
    const admin = createAdminClient();
    const path = String(body.path || '/').slice(0, 500);
    const common = { user_id: profile?.id || null, path };

    // A public work view means one registered account, once per work.
    // Guests are not counted and the composite primary key prevents duplicates.
    if (body.eventType === 'work_view') {
      if (!profile || !/^[0-9a-f-]{36}$/i.test(body.workId || '')) {
        return NextResponse.json({ success: true, counted: false });
      }
      const { error } = await admin.from('work_views').upsert(
        { work_id: body.workId, user_id: profile.id },
        { onConflict: 'work_id,user_id', ignoreDuplicates: true },
      );
      if (error) return NextResponse.json({ error: 'Ko‘rishni saqlab bo‘lmadi' }, { status: 500 });
      return NextResponse.json({ success: true, counted: true });
    }

    await admin.from('analytics_events').insert({
      session_id: body.sessionId,
      ...common,
      event_type: body.eventType,
      work_id: body.workId || null,
      chapter_id: body.chapterId || null,
      referrer_host: body.referrerHost ? String(body.referrerHost).slice(0, 150) : null,
      device_type: ['mobile', 'tablet', 'desktop'].includes(body.deviceType) ? body.deviceType : 'desktop',
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
