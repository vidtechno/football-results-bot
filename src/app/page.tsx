import React from 'react';
import Link from 'next/link';
import { getTodayMatches, getUpcomingMatches, getRecentMatches, getCompetitions } from '@/lib/db/queries';
import { MatchCard } from '@/components/fixtures/MatchCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Calendar, Trophy, ArrowRight, Zap, History } from 'lucide-react';
import Image from 'next/image';

export const revalidate = 60; // Revalidate home page every 60 seconds

export default async function HomePage() {
  const [todayMatches, upcomingMatches, recentMatches, competitions] = await Promise.all([
    getTodayMatches(),
    getUpcomingMatches(undefined, 8),
    getRecentMatches(undefined, 8),
    getCompetitions(),
  ]);

  const liveMatches = todayMatches.filter((f) =>
    ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'IN_PLAY'].includes((f.status || '').toUpperCase()),
  );

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="relative rounded-3xl overflow-hidden glass-panel p-6 sm:p-10 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950/80 -z-10" />
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <span>⚽ Uzbek Latin Futbol Portali</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Bugungi futbol natijalari va o‘yinlar jadvali
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            O‘zbekiston Superligasi, Premyer-Liga, La Liga va Yevropa Kuboklari haqidagi eng so‘nggi ma’lumotlar hamda rasmiy natijalar.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/matches"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>O‘yinlar taqvimi</span>
            </Link>
            <Link
              href="/competitions"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 transition-all"
            >
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span>Musobaqalar</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Competitions Quick Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <span>Asosiy musobaqalar</span>
          </h2>
          <Link href="/competitions" className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1">
            <span>Barchasi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {competitions.slice(0, 5).map((comp) => (
            <Link
              key={comp.slug}
              href={`/competitions/${comp.slug}`}
              className="glass-card rounded-xl p-3 flex items-center gap-3 border border-slate-800 hover:border-emerald-500/40"
            >
              {comp.logoUrl && (
                <Image
                  src={comp.logoUrl}
                  alt={comp.nameUz}
                  width={24}
                  height={24}
                  className="object-contain"
                />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-200 truncate">{comp.nameUz}</span>
                <span className="text-[10px] text-slate-400">{comp.countryUz}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Live / Today's Matches Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              <span>Bugungi o‘yinlar</span>
            </h2>
            {liveMatches.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold animate-pulse">
                🟢 {liveMatches.length} ta o‘yin bo‘lmoqda
              </span>
            )}
          </div>
          <Link href="/matches" className="text-sm font-semibold text-emerald-400 hover:underline flex items-center gap-1">
            <span>To‘liq o‘yinlar taqvimi</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {todayMatches.length === 0 ? (
          <EmptyState
            title="Bugun o‘yinlar yo‘q"
            description="Bugungi kunga belgilanagan rasmiy futbol o‘yinlari mavjud emas. Kelgusi o‘yinlar taqvimini ko‘rishingiz mumkin."
            icon="calendar"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayMatches.map((fixture) => (
              <MatchCard key={fixture.id || fixture.provider_fixture_id} fixture={fixture} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Matches */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <span>Kutilayotgan o‘yinlar</span>
          </h2>
        </div>

        {upcomingMatches.length === 0 ? (
          <EmptyState
            title="Kutilayotgan o‘yinlar topilmadi"
            description="Yaqin kunlarda rejalashtirilgan yangi o‘yinlar mavjud emas."
            icon="calendar"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingMatches.map((fixture) => (
              <MatchCard key={fixture.id || fixture.provider_fixture_id} fixture={fixture} />
            ))}
          </div>
        )}
      </section>

      {/* Recently Finished Matches */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-slate-400" />
            <span>Yaqinda yakunlangan o‘yinlar</span>
          </h2>
        </div>

        {recentMatches.length === 0 ? (
          <EmptyState
            title="Tugagan o‘yinlar topilmadi"
            description="Yaqin soatlarda tugagan o‘yin natijalari mavjud emas."
            icon="calendar"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMatches.map((fixture) => (
              <MatchCard key={fixture.id || fixture.provider_fixture_id} fixture={fixture} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
