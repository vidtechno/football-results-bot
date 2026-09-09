import { NextResponse } from 'next/server';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d);

function calculateStreak(rows: Array<{ activity_date: string; xp?: number; pages_read?: number }>, protectedDates: string[] = [], now = new Date()) {
  const active = new Set([...rows.filter(r => Number(r.pages_read || 0) > 0 || Number(r.xp || 0) > 0).map(r => r.activity_date), ...protectedDates]);
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
  const [{ data: activity, error }, { data: achievements }, { data: protections }, { data: xpTransactions }] = await Promise.all([
    admin.from('reading_daily_activity').select('activity_date,active_seconds,pages_read,chapters_completed,books_completed,xp').eq('user_id', profile.id).order('activity_date', { ascending: false }).limit(400),
    admin.from('reader_achievements').select('achievement_key,unlocked_at').eq('user_id', profile.id).order('unlocked_at', { ascending: false }),
    admin.from('streak_protections').select('protected_date,xp_cost,created_at').eq('user_id',profile.id).order('created_at',{ascending:false}),
    admin.from('reader_xp_transactions').select('amount').eq('user_id',profile.id),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const stats = calculateStreak(activity || [], (protections || []).map(p => p.protected_date));
  const availableXp = Math.max(0, stats.totalXp + (xpTransactions || []).reduce((s,r)=>s+Number(r.amount),0));
  const today = dayKey(new Date()); const yesterdayDate = new Date(); yesterdayDate.setUTCDate(yesterdayDate.getUTCDate()-1); const yesterday=dayKey(yesterdayDate);
  const activeDates = new Set((activity || []).filter(r=>Number(r.pages_read)>0||Number(r.xp)>0).map(r=>r.activity_date));
  const monthPrefix=today.slice(0,7); const usedThisMonth=(protections||[]).filter(p=>p.protected_date.startsWith(monthPrefix)).length;
  const nextCost=[100,200,350][Math.min(usedThisMonth,2)];
  const last7 = (activity || []).filter(row => Date.now() - new Date(`${row.activity_date}T00:00:00Z`).getTime() < 8 * 86400000);
  return NextResponse.json({ ...stats, availableXp, weeklyPages: last7.reduce((s, r) => s + Number(r.pages_read), 0), weeklyGoal: 35, activity: (activity || []).slice(0, 30), achievements: achievements || [], protections:protections||[], protectionsUsed:usedThisMonth, protectionsRemaining:Math.max(0,3-usedThisMonth), nextProtectionCost:nextCost, restoreDate:yesterday, canRestore:usedThisMonth<3&&!activeDates.has(yesterday)&&availableXp>=nextCost });
}

export async function POST(request:Request){const profile=await getCurrentProfile(request.headers.get('Authorization'));if(!profile)return NextResponse.json({error:'Avtorizatsiya talab etiladi'},{status:401});const body=await request.json();const date=String(body.date||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:'Sana noto‘g‘ri'},{status:400});const {data,error}=await createAdminClient().rpc('restore_reading_streak',{p_user_id:profile.id,p_date:date});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json(data);}
