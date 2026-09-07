import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const allowed = new Set(['presence', 'page_view', 'work_view', 'chapter_start', 'chapter_complete', 'signup_gate']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!allowed.has(body.eventType) || !/^[0-9a-f-]{36}$/i.test(body.sessionId || '')) {
      return NextResponse.json({ error: 'Noto‘g‘ri so‘rov' }, { status: 400 });
    }
    const profile = await getCurrentProfile(req.headers.get('Authorization'));
    const admin = createAdminClient();
    const path = String(body.path || '/').slice(0, 500);
    const common = { user_id: profile?.id || null, path };

    const presence = admin.from('analytics_presence').upsert({ session_id: body.sessionId, ...common, last_seen_at: new Date().toISOString() });
    if (body.eventType === 'presence') {
      await presence;
      return NextResponse.json({ success: true });
    }

    await Promise.all([
      presence,
      admin.from('analytics_events').insert({
        session_id: body.sessionId,
        ...common,
        event_type: body.eventType,
        work_id: body.workId || null,
        chapter_id: body.chapterId || null,
        referrer_host: body.referrerHost ? String(body.referrerHost).slice(0, 150) : null,
        device_type: ['mobile', 'tablet', 'desktop'].includes(body.deviceType) ? body.deviceType : 'desktop',
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server xatosi' }, { status: 500 });
  }
}
