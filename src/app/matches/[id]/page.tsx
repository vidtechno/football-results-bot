import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getFixtureById } from '@/lib/db/queries';
import { mapFixtureStatus, formatUzbekDate, formatUzbekTime, formatUzbekDateTime } from '@/lib/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { Trophy, Calendar, MapPin, Shield, ArrowLeft } from 'lucide-react';

interface MatchDetailProps {
  params: {
    id: string;
  };
}

export const revalidate = 60;

export default async function MatchDetailPage({ params }: MatchDetailProps) {
  const matchId = parseInt(params.id, 10);
  if (isNaN(matchId)) {
    notFound();
  }

  const fixture = await getFixtureById(matchId);
  if (!fixture) {
    notFound();
  }

  const statusInfo = mapFixtureStatus(fixture.status);
  const homeTeam = fixture.home_team;
  const awayTeam = fixture.away_team;
  const comp = fixture.competition;

  const dateStr = formatUzbekDate(fixture.scheduled_at);
  const timeStr = formatUzbekTime(fixture.scheduled_at);
  const hasScore = fixture.home_score !== null && fixture.away_score !== null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>O‘yinlar ro‘yxatiga qaytish</span>
      </Link>

      {/* Main Match Header Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-slate-800 space-y-8">
        {/* League Info Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 text-sm text-slate-400">
          {comp ? (
            <Link href={`/competitions/${comp.slug}`} className="flex items-center gap-2.5 hover:text-white transition-colors">
              {comp.logo_url && (
                <Image src={comp.logo_url} alt={comp.name} width={20} height={20} className="object-contain" />
              )}
              <span className="font-bold text-slate-200">{comp.name}</span>
              {fixture.round && <span className="text-slate-500 text-xs">• {fixture.round}</span>}
            </Link>
          ) : (
            <span>Futbol Uchrashuvi</span>
          )}

          <Badge className={statusInfo.badgeClass}>{statusInfo.badgeText}</Badge>
        </div>

        {/* Teams & Score Dashboard */}
        <div className="grid grid-cols-12 items-center gap-4 py-4">
          {/* Home Team */}
          <div className="col-span-5 flex flex-col items-center text-center space-y-3">
            {homeTeam?.logo_url ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900/90 p-3 border border-slate-800 flex items-center justify-center shadow-lg">
                <Image
                  src={homeTeam.logo_url}
                  alt={homeTeam.name}
                  width={70}
                  height={70}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-4xl">
                ⚽
              </div>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">{homeTeam?.name || 'Mezbon'}</h2>
              {homeTeam && (
                <FavoriteButton
                  type="team"
                  id={homeTeam.provider_team_id || homeTeam.id}
                  name={homeTeam.name}
                  logoUrl={homeTeam.logo_url}
                />
              )}
            </div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Mezbon Jamoa</span>
          </div>

          {/* Center Score & Time */}
          <div className="col-span-2 flex flex-col items-center justify-center text-center">
            {hasScore ? (
              <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-inner">
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">{fixture.home_score}</span>
                <span className="text-xl text-slate-600 font-bold">:</span>
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400">{fixture.away_score}</span>
              </div>
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-200 bg-slate-900 px-4 py-2 rounded-2xl border border-slate-800">
                {timeStr}
              </div>
            )}
            <span className="mt-2 text-xs font-semibold text-slate-400">{statusInfo.shortLabel}</span>
          </div>

          {/* Away Team */}
          <div className="col-span-5 flex flex-col items-center text-center space-y-3">
            {awayTeam?.logo_url ? (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900/90 p-3 border border-slate-800 flex items-center justify-center shadow-lg">
                <Image
                  src={awayTeam.logo_url}
                  alt={awayTeam.name}
                  width={70}
                  height={70}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-900 flex items-center justify-center text-4xl">
                ⚽
              </div>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">{awayTeam?.name || 'Mehmon'}</h2>
              {awayTeam && (
                <FavoriteButton
                  type="team"
                  id={awayTeam.provider_team_id || awayTeam.id}
                  name={awayTeam.name}
                  logoUrl={awayTeam.logo_url}
                />
              )}
            </div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Mehmon Jamoa</span>
          </div>
        </div>

        {/* Detailed Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 text-xs">
          <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-slate-800">
            <Calendar className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 text-[11px]">Boshlanish vaqti</span>
              <span className="font-semibold text-slate-200">{formatUzbekDateTime(fixture.scheduled_at)} (Toshkent)</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-slate-800">
            <MapPin className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 text-[11px]">Stadion / Stadion nomi</span>
              <span className="font-semibold text-slate-200">{fixture.venue_name || 'Noma’lum stadion'}</span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-3.5 flex items-center gap-3 border border-slate-800">
            <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="block text-slate-500 text-[11px]">Musobaqa bosqichi</span>
              <span className="font-semibold text-slate-200">{fixture.round || 'Asosiy bosqich'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
