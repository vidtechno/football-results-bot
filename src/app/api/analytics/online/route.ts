import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const since = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  const { count } = await createAdminClient()
    .from('analytics_presence')
    .select('session_id', { count: 'exact', head: true })
    .gte('last_seen_at', since);
  return NextResponse.json({ online: count || 0 }, { headers: { 'Cache-Control': 'public, max-age=20, stale-while-revalidate=40' } });
}
