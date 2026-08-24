import React from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getCompetitionBySlug, getUpcomingMatches, getRecentMatches } from '@/lib/db/queries';
import { MatchCard } from '@/components/fixtures/MatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { Trophy, Calendar, History, Shield } from 'lucide-react';

interface CompetitionDetailProps {
  params: {
    slug: string;
  };
}

export const revalidate = 120;

export default async function CompetitionDetailPage({ params }: CompetitionDetailProps) {
  const comp = await getCompetitionBySlug(params.slug);

  if (!comp) {
    notFound();
  }

  const [upcoming, recent] = await Promise.all([
    getUpcomingMatches(comp.id, 10),
    getRecentMatches(comp.id, 10),
  ]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {comp.logoUrl ? (
            <div className="w-20 h-20 rounded-2xl bg-slate-900/90 p-3 border border-slate-700/60 flex items-center justify-center shadow-lg">
              <Image
                src={comp.logoUrl}
                alt={comp.nameUz}
                width={60}
                height={60}
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center text-3xl">
              🏆
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{comp.flag}</span>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                {comp.countryUz}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{comp.nameUz}</h1>
            <p className="text-xs text-slate-400 font-medium">Rasmiy musobaqa kodi: {comp.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <FavoriteButton
            type="competition"
            id={comp.providerId}
            name={comp.nameUz}
            logoUrl={comp.logoUrl}
            className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800"
          />
        </div>
      </div>

      {/* Upcoming Fixtures */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <span>Kutilayotgan o‘yinlar</span>
        </h2>

        {upcoming.length === 0 ? (
          <EmptyState
            title="Kutilayotgan o‘yinlar mavjud emas"
            description="Ushbu musobaqa uchun yaqin kunlarda rejalashtirilgan yangi o‘yinlar yo‘q."
            icon="calendar"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((fixture) => (
              <MatchCard key={fixture.id || fixture.provider_fixture_id} fixture={fixture} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <span>Yakunlangan o‘yinlar natijalari</span>
        </h2>

        {recent.length === 0 ? (
          <EmptyState
            title="So‘nggi natijalar mavjud emas"
            description="Ushbu musobaqaning so‘nggi tugagan o‘yinlari hozircha bazada mavjud emas."
            icon="calendar"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recent.map((fixture) => (
              <MatchCard key={fixture.id || fixture.provider_fixture_id} fixture={fixture} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
