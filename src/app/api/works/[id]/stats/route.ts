import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface CachedStats {
  views: number;
  readers: number;
  bookmarks: number;
  completed: number;
  followers: number;
}

const statsCache = new Map<string, { data: CachedStats; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(workId)) {
    return NextResponse.json({ error: 'Noto‘g‘ri ID' }, { status: 400 });
  }

  const now = Date.now();
  const cached = statsCache.get(workId);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  }

  const db = createAdminClient();

  // Attempt atomic RPC first
  let stats: CachedStats | null = null;
  try {
    const { data, error } = await db.rpc('get_work_public_stats', { p_work_id: workId });
    if (!error && data && typeof data === 'object') {
      const rpcData = data as Record<string, number>;
      stats = {
        views: Number(rpcData.views) || 0,
        readers: Number(rpcData.readers) || 0,
        bookmarks: Number(rpcData.bookmarks) || 0,
        completed: Number(rpcData.completed) || 0,
        followers: Number(rpcData.followers) || 0,
      };
    }
  } catch {
    // Fallback below
  }

  // Graceful fallback if RPC is not available yet
  if (!stats) {
    const [{ count: views }, { count: readers }, { count: bookmarks }, { count: completed }, { count: followers }] = await Promise.all([
      db.from('work_views').select('user_id', { count: 'exact', head: true }).eq('work_id', workId),
      db.from('reading_progress').select('id', { count: 'exact', head: true }).eq('work_id', workId),
      db.from('reading_bookmarks').select('id', { count: 'exact', head: true }).eq('work_id', workId),
      db.from('reading_progress').select('id', { count: 'exact', head: true }).eq('work_id', workId).or('percentage.gte.100,is_completed.eq.true'),
      db.from('work_follows').select('id', { count: 'exact', head: true }).eq('work_id', workId),
    ]);

    stats = {
      views: views || 0,
      readers: readers || 0,
      bookmarks: bookmarks || 0,
      completed: completed || 0,
      followers: followers || 0,
    };
  }

  statsCache.set(workId, { data: stats, timestamp: now });

  // Clean up cache size if too large
  if (statsCache.size > 2000) {
    const oldestKeys = Array.from(statsCache.keys()).slice(0, 500);
    for (const key of oldestKeys) {
      statsCache.delete(key);
    }
  }

  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
    },
  });
}
