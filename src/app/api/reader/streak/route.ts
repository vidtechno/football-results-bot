import { NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d);

function calculateStreak(rows: Array<{ activity_date: string; xp?: number; pages_read?: number }>, now = new Date()) {
  const active = new Set(rows.filter(r => Number(r.pages_read || 0) > 0 || Number(r.xp || 0) > 0).map(r => r.activity_date));
  let cursor = new Date(now);
  if (!active.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let current = 0;
  while (active.has(dayKey(cursor))) { current++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
  const sorted = [...active].sort();
  let longest = 0, run = 0, previous = '';
  for (const key of sorted) {
    const expected = previous ? new Date(`${previous}T12:00:00Z`) : null;
    if (expected) expected.setUTCDate(expected.getUTCDate() + 1);
    run = expected && dayKey(expected) === key ? run + 1 : 1;
    longest = Math.max(longest, run); previous = key;
  }
  const totalXp = rows.reduce((sum, r) => sum + Number(r.xp || 0), 0);
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const levelStart = Math.pow(level - 1, 2) * 100;
  const nextLevel = Math.pow(level, 2) * 100;
  return { current, longest, totalXp, level, levelProgress: Math.round(((totalXp - levelStart) / Math.max(1, nextLevel - levelStart)) * 100), nextLevelXp: nextLevel };
}

export async function GET(request: Request) {
  const profile = await getCurrentProfile(request.headers.get('Authorization'));
  if (!profile) return NextResponse.json({ error: 'Avtorizatsiya talab etiladi' }, { status: 401 });
  const admin = createAdminClient();
  const [{ data: activity, error }, { data: achievements }] = await Promise.all([
    admin.from('reading_daily_activity').select('activity_date,active_seconds,pages_read,chapters_completed,books_completed,xp').eq('user_id', profile.id).order('activity_date', { ascending: false }).limit(400),
    admin.from('reader_achievements').select('achievement_key,unlocked_at').eq('user_id', profile.id).order('unlocked_at', { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const stats = calculateStreak(activity || []);
  const last7 = (activity || []).filter(row => Date.now() - new Date(`${row.activity_date}T00:00:00Z`).getTime() < 8 * 86400000);
  return NextResponse.json({ ...stats, weeklyPages: last7.reduce((s, r) => s + Number(r.pages_read), 0), weeklyGoal: 35, activity: (activity || []).slice(0, 30), achievements: achievements || [] });
}
