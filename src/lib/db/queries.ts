import { createAdminClient } from '@/lib/supabase/server';
import { TARGET_COMPETITIONS, CompetitionMeta } from '@/lib/constants/competitions';

export interface DBCompetition {
  id: number;
  provider_competition_id: number;
  external_id?: number;
  name: string;
  country: string;
  logo_url: string;
  slug: string;
  code: string;
}

export interface DBTeam {
  id: number;
  provider_team_id: number;
  external_id?: number;
  name: string;
  code: string;
  logo_url: string;
  country: string;
}

export interface DBFixture {
  id: number;
  provider_fixture_id: number;
  external_id?: number;
  competition_id: number;
  home_team_id: number;
  away_team_id: number;
  scheduled_at: string;
  kickoff_at?: string;
  status: string;
  status_short?: string;
  home_score: number | null;
  away_score: number | null;
  venue_name: string | null;
  venue?: string | null;
  round: string | null;
  synced_at?: string;
  updated_at?: string;
  competition?: DBCompetition;
  home_team?: DBTeam;
  away_team?: DBTeam;
}

function normalizeFixture(f: any): DBFixture {
  return {
    ...f,
    provider_fixture_id: f.provider_fixture_id || f.external_id || f.id,
    scheduled_at: f.scheduled_at || f.kickoff_at || new Date().toISOString(),
    status: (f.status_short || f.status || 'NS').toUpperCase(),
    venue_name: f.venue_name || f.venue || null,
  };
}

/**
 * Fetch all target competitions (merge database details with fallback meta)
 */
export async function getCompetitions(): Promise<(DBCompetition & CompetitionMeta)[]> {
  try {
    const supabase = createAdminClient();
    const { data: dbComps, error } = await supabase.from('competitions').select('*');

    if (error) {
      console.warn('[DB Queries] Supabase query warning (using fallback competitions):', error.message);
    }

    const compMap = new Map<number, any>();
    dbComps?.forEach((c: any) => {
      const extId = c.external_id || c.provider_competition_id || c.id;
      compMap.set(extId, c);
    });

    return TARGET_COMPETITIONS.map((meta) => {
      const dbComp = compMap.get(meta.providerId);
      return {
        ...meta,
        id: dbComp?.id || meta.providerId,
        provider_competition_id: meta.providerId,
        name: dbComp?.name || meta.nameUz,
        country: dbComp?.country || meta.countryUz,
        logo_url: dbComp?.logo_url || meta.logoUrl,
        slug: meta.slug,
        code: meta.code,
      };
    });
  } catch (err) {
    return TARGET_COMPETITIONS.map((meta) => ({
      ...meta,
      id: meta.providerId,
      provider_competition_id: meta.providerId,
      name: meta.nameUz,
      country: meta.countryUz,
      logo_url: meta.logoUrl,
      slug: meta.slug,
      code: meta.code,
    }));
  }
}

/**
 * Fetch competition by slug
 */
export async function getCompetitionBySlug(slug: string) {
  const all = await getCompetitions();
  return all.find((c) => c.slug === slug);
}

/**
 * Fetch matches by date string YYYY-MM-DD
 */
export async function getMatchesByDate(dateStr: string, competitionId?: number): Promise<DBFixture[]> {
  try {
    const supabase = createAdminClient();

    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    let query = supabase
      .from('fixtures')
      .select(`
        *,
        competition:competitions(*),
        home_team:teams!home_team_id(*),
        away_team:teams!away_team_id(*)
      `);

    // Handle either scheduled_at or kickoff_at column
    query = query
      .or(`scheduled_at.gte.${startOfDay},kickoff_at.gte.${startOfDay}`)
      .or(`scheduled_at.lte.${endOfDay},kickoff_at.lte.${endOfDay}`);

    if (competitionId) {
      query = query.eq('competition_id', competitionId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map(normalizeFixture);
  } catch {
    return [];
  }
}

/**
 * Fetch today's matches
 */
export async function getTodayMatches(competitionId?: number): Promise<DBFixture[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  return getMatchesByDate(todayStr, competitionId);
}

/**
 * Fetch upcoming matches starting after now
 */
export async function getUpcomingMatches(competitionId?: number, limit = 20): Promise<DBFixture[]> {
  try {
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from('fixtures')
      .select(`
        *,
        competition:competitions(*),
        home_team:teams!home_team_id(*),
        away_team:teams!away_team_id(*)
      `)
      .or(`scheduled_at.gte.${nowIso},kickoff_at.gte.${nowIso}`)
      .limit(limit);

    if (competitionId) {
      query = query.eq('competition_id', competitionId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map(normalizeFixture);
  } catch {
    return [];
  }
}

/**
 * Fetch recently finished matches
 */
export async function getRecentMatches(competitionId?: number, limit = 20): Promise<DBFixture[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('fixtures')
      .select(`
        *,
        competition:competitions(*),
        home_team:teams!home_team_id(*),
        away_team:teams!away_team_id(*)
      `)
      .in('status', ['FT', 'AET', 'PEN'])
      .limit(limit);

    if (competitionId) {
      query = query.eq('competition_id', competitionId);
    }

    const { data, error } = await query;
    if (error || !data) {
      return [];
    }

    return data.map(normalizeFixture);
  } catch {
    return [];
  }
}

/**
 * Fetch a single fixture by primary ID or provider ID
 */
export async function getFixtureById(id: number): Promise<DBFixture | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('fixtures')
      .select(`
        *,
        competition:competitions(*),
        home_team:teams!home_team_id(*),
        away_team:teams!away_team_id(*)
      `)
      .or(`id.eq.${id},external_id.eq.${id},provider_fixture_id.eq.${id}`)
      .single();

    if (error || !data) {
      return null;
    }

    return normalizeFixture(data);
  } catch {
    return null;
  }
}

/**
 * Get last successful sync timestamp from api_sync_state or fixtures
 */
export async function getLastSyncTime(): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('api_sync_state')
      .select('*')
      .eq('status', 'SUCCESS')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.last_synced_at || data?.updated_at) {
      return data.last_synced_at || data.updated_at;
    }

    // Fallback to latest fixture updated_at
    const { data: fixData } = await supabase
      .from('fixtures')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    return fixData?.updated_at || null;
  } catch {
    return null;
  }
}
