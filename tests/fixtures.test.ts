import { describe, it, expect } from 'vitest';
import { FixtureService, type PopulatedFixture } from '../src/modules/fixtures/service.js';
import { MATCH_STATUS_LABELS } from '../src/utils/constants.js';

describe('Fixture Formatting Rules', () => {
  const mockBaseFixture: PopulatedFixture = {
    id: 1,
    externalId: 1001,
    competitionId: 1,
    season: 2026,
    round: '1-tur',
    homeTeamId: 1,
    awayTeamId: 2,
    status: 'NS',
    statusShort: 'NS',
    kickoffAt: new Date('2026-08-22T18:00:00.000Z'),
    homeScore: null,
    awayScore: null,
    halfTimeHomeScore: null,
    halfTimeAwayScore: null,
    fullTimeHomeScore: null,
    fullTimeAwayScore: null,
    venue: 'Paxtakor markaziy stadioni',
    referee: 'Ravshan Ermatov',
    createdAt: new Date(),
    updatedAt: new Date(),
    homeTeam: {
      id: 1,
      externalId: 201,
      name: 'Paxtakor',
      code: 'PAK',
      country: 'Uzbekistan',
      logoUrl: null,
      venueName: 'Paxtakor',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    awayTeam: {
      id: 2,
      externalId: 202,
      name: 'Navbahor',
      code: 'NAV',
      country: 'Uzbekistan',
      logoUrl: null,
      venueName: 'Markaziy',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    competition: {
      id: 1,
      externalId: 352,
      name: 'O‘zbekiston Superligasi',
      code: 'UZB_SL',
      country: 'Uzbekistan',
      logoUrl: null,
      type: 'league',
      isActive: true,
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };

  it('should show "🟢 O‘yin bo‘lmoqda" for LIVE status without polling requirement', () => {
    const liveFixture = { ...mockBaseFixture, status: 'LIVE', statusShort: '1H' };
    const statusText = FixtureService.formatFixtureStatusText(liveFixture);
    expect(statusText).toBe(MATCH_STATUS_LABELS.LIVE);
  });

  it('should show final score for FT status', () => {
    const finishedFixture = {
      ...mockBaseFixture,
      status: 'FT',
      statusShort: 'FT',
      homeScore: 2,
      awayScore: 1,
      fullTimeHomeScore: 2,
      fullTimeAwayScore: 1,
    };
    const statusText = FixtureService.formatFixtureStatusText(finishedFixture);
    expect(statusText).toContain(MATCH_STATUS_LABELS.FINISHED);
    expect(statusText).toContain('2 - 1');
  });

  it('should show "⏳ Boshlanmagan" with kickoff time for NS status', () => {
    const scheduledFixture = { ...mockBaseFixture, status: 'NS' };
    const statusText = FixtureService.formatFixtureStatusText(scheduledFixture);
    expect(statusText).toContain(MATCH_STATUS_LABELS.NOT_STARTED);
  });
});
