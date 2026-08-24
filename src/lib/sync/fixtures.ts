import { createAdminClient } from '@/lib/supabase/server';
import { fetchFixturesFromApi } from '@/lib/api-football/client';
import { TARGET_COMPETITIONS } from '@/lib/constants/competitions';

export interface SyncOptions {
  dates?: string[]; // Array of 'YYYY-MM-DD' strings
}

export interface SyncResult {
  success: boolean;
  datesSynced: string[];
  recordsSynced: number;
  error?: string;
}

/**
 * Seed or update target competitions in Supabase
 */
export async function ensureCompetitionsExist() {
  const supabase = createAdminClient();

  const competitionRows = TARGET_COMPETITIONS.map((c, idx) => ({
    external_id: c.providerId,
    name: c.nameUz,
    country: c.countryUz,
    logo_url: c.logoUrl,
    code: c.code,
    type: 'league',
    is_active: true,
    display_order: idx + 1,
  }));

  const { error } = await supabase.from('competitions').upsert(competitionRows, {
    onConflict: 'external_id',
  });

  if (error) {
    console.error('[Sync] Error ensuring competitions exist:', error);
  }
}

/**
 * Sync fixtures for specific dates (default: today and tomorrow)
 */
export async function syncFixtures(options: SyncOptions = {}): Promise<SyncResult> {
  const supabase = createAdminClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  const datesToSync = options.dates && options.dates.length > 0
    ? options.dates
    : [todayStr, tomorrowStr];

  let totalRecordsSynced = 0;

  try {
    // 1. Ensure target competitions are in database
    await ensureCompetitionsExist();

    // Fetch competition database map
    const { data: dbCompetitions, error: compErr } = await supabase
      .from('competitions')
      .select('*');

    if (compErr) throw compErr;

    const compMap = new Map<number, number>();
    dbCompetitions?.forEach((c: any) => {
      const extId = c.external_id || c.id;
      compMap.set(extId, c.id);
    });

    // 2. Fetch and process fixtures per date
    for (const dateStr of datesToSync) {
      console.log(`[Sync] Fetching fixtures for date: ${dateStr}`);
      const rawFixtures = await fetchFixturesFromApi({ date: dateStr });

      // Filter only target competitions
      const targetFixtures = rawFixtures.filter((f) => compMap.has(f.league.id));

      if (targetFixtures.length === 0) {
        console.log(`[Sync] No fixtures for target competitions on ${dateStr}`);
        continue;
      }

      // Collect and upsert teams
      const teamsToUpsert = new Map<number, any>();

      for (const f of targetFixtures) {
        if (!teamsToUpsert.has(f.teams.home.id)) {
          teamsToUpsert.set(f.teams.home.id, {
            external_id: f.teams.home.id,
            name: f.teams.home.name,
            logo_url: f.teams.home.logo,
            country: f.league.country,
          });
        }
        if (!teamsToUpsert.has(f.teams.away.id)) {
          teamsToUpsert.set(f.teams.away.id, {
            external_id: f.teams.away.id,
            name: f.teams.away.name,
            logo_url: f.teams.away.logo,
            country: f.league.country,
          });
        }
      }

      const teamArray = Array.from(teamsToUpsert.values());
      const { error: teamUpsertErr } = await supabase
        .from('teams')
        .upsert(teamArray, { onConflict: 'external_id' });

      if (teamUpsertErr) {
        console.error('[Sync] Team upsert error:', teamUpsertErr);
      }

      // Fetch team database map
      const { data: dbTeams } = await supabase.from('teams').select('*');
      const teamMap = new Map<number, number>();
      dbTeams?.forEach((t: any) => {
        const extId = t.external_id || t.id;
        teamMap.set(extId, t.id);
      });

      // Build fixture rows to upsert
      const fixtureRows = targetFixtures.map((f) => {
        const compDbId = compMap.get(f.league.id)!;
        const homeDbId = teamMap.get(f.teams.home.id)!;
        const awayDbId = teamMap.get(f.teams.away.id)!;
        const statusShort = (f.fixture.status.short || 'NS').toUpperCase();

        return {
          external_id: f.fixture.id,
          competition_id: compDbId,
          season: f.league.season || new Date().getFullYear(),
          round: f.league.round || null,
          home_team_id: homeDbId,
          away_team_id: awayDbId,
          status: statusShort,
          status_short: statusShort,
          kickoff_at: f.fixture.date,
          home_score: f.goals.home ?? null,
          away_score: f.goals.away ?? null,
          full_time_home_score: f.score?.fulltime?.home ?? f.goals.home ?? null,
          full_time_away_score: f.score?.fulltime?.away ?? f.goals.away ?? null,
          venue: f.fixture.venue?.name || null,
          referee: f.fixture.referee || null,
          updated_at: new Date().toISOString(),
        };
      });

      const { error: fixtureUpsertErr } = await supabase
        .from('fixtures')
        .upsert(fixtureRows, { onConflict: 'external_id' });

      if (fixtureUpsertErr) {
        console.error('[Sync] Fixture upsert error:', fixtureUpsertErr);
        throw fixtureUpsertErr;
      }

      totalRecordsSynced += fixtureRows.length;
    }

    // 3. Log success in api_sync_state
    await supabase.from('api_sync_state').insert({
      sync_type: 'fixtures',
      status: 'SUCCESS',
      last_synced_at: new Date().toISOString(),
      metadata: { records_synced: totalRecordsSynced, datesSynced: datesToSync },
      updated_at: new Date().toISOString(),
    });

    return {
      success: true,
      datesSynced: datesToSync,
      recordsSynced: totalRecordsSynced,
    };
  } catch (err: any) {
    const errorMsg = err.message || 'Unknown sync error';
    console.error('[Sync] Failed:', errorMsg);

    await supabase.from('api_sync_state').insert({
      sync_type: 'fixtures',
      status: 'ERROR',
      last_synced_at: new Date().toISOString(),
      error_message: errorMsg,
      metadata: { records_synced: totalRecordsSynced, datesSynced: datesToSync },
      updated_at: new Date().toISOString(),
    });

    return {
      success: false,
      datesSynced: datesToSync,
      recordsSynced: totalRecordsSynced,
      error: errorMsg,
    };
  }
}
