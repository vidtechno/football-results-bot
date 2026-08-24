import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { DBFixture } from '@/lib/db/queries';
import { mapFixtureStatus, formatUzbekTime, formatUzbekDate } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';

interface MatchCardProps {
  fixture: DBFixture;
}

export function MatchCard({ fixture }: MatchCardProps) {
  const statusInfo = mapFixtureStatus(fixture.status);
  const timeStr = formatUzbekTime(fixture.scheduled_at);
  const dateStr = formatUzbekDate(fixture.scheduled_at);

  const homeTeam = fixture.home_team;
  const awayTeam = fixture.away_team;
  const comp = fixture.competition;

  const hasScore = fixture.home_score !== null && fixture.away_score !== null;

  return (
    <div className="glass-card rounded-xl border border-slate-800/90 overflow-hidden hover:border-emerald-500/40 transition-all">
      {/* League Header */}
      <div className="bg-slate-900/60 px-4 py-2 flex items-center justify-between border-b border-slate-800/60 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-medium">
          {comp?.logo_url && (
            <Image
              src={comp.logo_url}
              alt={comp.name || 'League'}
              width={16}
              height={16}
              className="object-contain"
            />
          )}
          <span className="text-slate-300">{comp?.name || 'Musobaqa'}</span>
          {fixture.round && (
            <span className="text-slate-500 text-[11px] hidden sm:inline">• {fixture.round}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {statusInfo.isLive ? (
            <Badge className={statusInfo.badgeClass}>{statusInfo.badgeText}</Badge>
          ) : (
            <span className="text-slate-400 text-[11px]">{dateStr}</span>
          )}
          {comp && (
            <FavoriteButton
              type="competition"
              id={comp.provider_competition_id || comp.id}
              name={comp.name}
              logoUrl={comp.logo_url}
            />
          )}
        </div>
      </div>

      {/* Main Card Link */}
      <Link href={`/matches/${fixture.id || fixture.provider_fixture_id}`} className="block p-4">
        <div className="grid grid-cols-12 items-center gap-3">
          {/* Home Team */}
          <div className="col-span-4 flex items-center gap-2.5 justify-end text-right">
            <span className="font-semibold text-sm text-slate-200 line-clamp-1">
              {homeTeam?.name || 'Mezbon'}
            </span>
            {homeTeam?.logo_url ? (
              <Image
                src={homeTeam.logo_url}
                alt={homeTeam.name}
                width={28}
                height={28}
                className="object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                ⚽
              </div>
            )}
          </div>

          {/* Score / Time Box */}
          <div className="col-span-4 flex flex-col items-center justify-center text-center">
            {hasScore ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700/60">
                <span className="text-xl font-bold text-emerald-400">{fixture.home_score}</span>
                <span className="text-slate-600 font-bold">:</span>
                <span className="text-xl font-bold text-emerald-400">{fixture.away_score}</span>
              </div>
            ) : (
              <div className="text-base font-bold text-slate-300 bg-slate-900/60 px-3 py-1 rounded-lg border border-slate-800">
                {timeStr}
              </div>
            )}

            <span className="mt-1 text-[11px] text-slate-400 font-medium">
              {statusInfo.shortLabel}
            </span>
          </div>

          {/* Away Team */}
          <div className="col-span-4 flex items-center gap-2.5 justify-start text-left">
            {awayTeam?.logo_url ? (
              <Image
                src={awayTeam.logo_url}
                alt={awayTeam.name}
                width={28}
                height={28}
                className="object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold">
                ⚽
              </div>
            )}
            <span className="font-semibold text-sm text-slate-200 line-clamp-1">
              {awayTeam?.name || 'Mehmon'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
