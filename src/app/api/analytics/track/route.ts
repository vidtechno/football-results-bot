import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

const TrackEventSchema = z.object({
  organization_id: z.number().int().positive(),
  event_type: z.enum(['search_select', 'profile_open', 'card_click']),
  visitor_id: z.string().min(1).max(256),
});

const SALT = process.env.ANALYTICS_SALT || 'manbora_privacy_salt_2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TrackEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { organization_id, event_type, visitor_id } = parsed.data;

    // Check bot user agent
    const ua = req.headers.get('user-agent') || '';
    if (/(bot|crawler|spider|slurp|facebookexternalhit|bingbot|googlebot)/i.test(ua)) {
      return NextResponse.json({ status: 'ignored_bot' }, { status: 200 });
    }

    // Hash anonymous visitor ID server-side (never store raw visitor_id or IP)
    const visitor_hash = crypto
      .createHash('sha256')
      .update(`${visitor_id}_${SALT}`)
      .digest('hex');

    const supabase = createAdminClient();

    // Deduplication window: Skip if same visitor tracked same organization in the last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentEvents } = await supabase
      .from('organization_popularity_events')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('visitor_hash', visitor_hash)
      .gte('created_at', oneHourAgo)
      .limit(1);

    if (recentEvents && recentEvents.length > 0) {
      return NextResponse.json({ status: 'duplicate_skipped' }, { status: 200 });
    }

    // Rate-limit: Max 15 events per visitor_hash in last 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('organization_popularity_events')
      .select('id', { count: 'exact' })
      .eq('visitor_hash', visitor_hash)
      .gte('created_at', oneMinuteAgo);

    if (recentCount && recentCount >= 15) {
      return NextResponse.json({ status: 'rate_limited' }, { status: 429 });
    }

    // Insert privacy-safe event
    const { error } = await supabase.from('organization_popularity_events').insert([
      {
        organization_id,
        event_type,
        visitor_hash,
      },
    ]);

    if (error) {
      return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
    }

    return NextResponse.json({ status: 'recorded' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
