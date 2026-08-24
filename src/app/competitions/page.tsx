import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCompetitions } from '@/lib/db/queries';
import { Trophy, ChevronRight } from 'lucide-react';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';

export const revalidate = 300;

export default async function CompetitionsPage() {
  const competitions = await getCompetitions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2">
          <Trophy className="w-7 h-7 text-emerald-400" />
          <span>Musobaqalar katalogi</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          O‘zbekiston va Yevropaning eng kuchli futbol ligalari va kubok musobaqalari
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitions.map((comp) => (
          <div
            key={comp.slug}
            className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/40 flex flex-col justify-between group transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {comp.logoUrl ? (
                  <div className="w-12 h-12 rounded-xl bg-slate-900/90 p-2 border border-slate-800 flex items-center justify-center">
                    <Image
                      src={comp.logoUrl}
                      alt={comp.nameUz}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-xl">
                    🏆
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-100 text-base group-hover:text-emerald-400 transition-colors">
                    {comp.nameUz}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    <span>{comp.flag}</span>
                    <span>{comp.countryUz}</span>
                  </div>
                </div>
              </div>

              <FavoriteButton
                type="competition"
                id={comp.providerId}
                name={comp.nameUz}
                logoUrl={comp.logoUrl}
              />
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">{comp.code || 'LIGA'}</span>
              <Link
                href={`/competitions/${comp.slug}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform"
              >
                <span>Batafsil ko‘rish</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
