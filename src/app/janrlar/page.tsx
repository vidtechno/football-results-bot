import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Tag,
  ChevronRight,
  Layers,
  BookHeart,
  BriefcaseBusiness,
  GraduationCap,
  Shapes,
} from 'lucide-react';
import { getGenresWithCounts } from '@/lib/db/queries';
import { GENRE_GROUPS } from '@/lib/config/genreGroups';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Janrlar katalogi',
  description:
    'O‘zbek adabiyoti va jahon asarlari janrlar bo‘yicha: Roman, Qissa, Detektiv, Fantastika, Tarixiy, Biznes va boshqalar.',
  alternates: {
    canonical: '/janrlar',
  },
};

export default async function JanrlarPage() {
  const genres = await getGenresWithCounts();
  const genreBySlug = new Map(genres.map((genre) => [genre.slug, genre]));
  const groupStyles = {
    fiction: {
      icon: BookHeart,
      surface: 'from-rose-50 to-amber-50/50',
      iconClass: 'bg-rose-100 text-rose-700',
      accent: 'group-hover:border-rose-300',
    },
    business: {
      icon: BriefcaseBusiness,
      surface: 'from-emerald-50 to-teal-50/50',
      iconClass: 'bg-emerald-100 text-emerald-700',
      accent: 'group-hover:border-emerald-300',
    },
    education: {
      icon: GraduationCap,
      surface: 'from-sky-50 to-indigo-50/50',
      iconClass: 'bg-sky-100 text-sky-700',
      accent: 'group-hover:border-sky-300',
    },
    formats: {
      icon: Shapes,
      surface: 'from-violet-50 to-fuchsia-50/40',
      iconClass: 'bg-violet-100 text-violet-700',
      accent: 'group-hover:border-violet-300',
    },
  } as const;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Header */}
      <div className="genre-hero relative overflow-hidden rounded-3xl border border-stone-200 bg-white px-6 py-8 sm:px-10 sm:py-10">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-100/70 blur-3xl" />
        <div className="relative space-y-2 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-black font-sans text-[#1C1917] tracking-tight flex items-center gap-2.5">
            <Layers className="w-7 h-7 text-amber-600" />
            <span>O‘zingizga mos mutolaani toping</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] font-medium">
            Badiiy asarlardan biznes va texnologiyagacha — barcha janrlar tushunarli yo‘nalishlarga
            ajratilgan.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {GENRE_GROUPS.map((group) => {
          const style = groupStyles[group.id];
          const GroupIcon = style.icon;
          const groupGenres = group.slugs.map((slug) => genreBySlug.get(slug)).filter(Boolean);
          return (
            <section
              key={group.id}
              className={`genre-group rounded-[2rem] border border-stone-200 bg-gradient-to-br ${style.surface} p-5 sm:p-7`}
            >
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style.iconClass}`}
                >
                  <GroupIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-sans text-xl font-black text-stone-900 sm:text-2xl">
                    {group.title}
                  </h2>
                  <p className="text-xs text-stone-500">{group.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {groupGenres.map(
                  (genre) =>
                    genre && (
                      <Link
                        key={genre.id}
                        href={`/janrlar/${genre.slug}`}
                        className={`genre-card group flex min-h-28 flex-col justify-between rounded-2xl border border-white/90 bg-white/90 p-4 shadow-xs transition-all ${style.accent}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-600">
                            <Tag className="h-4 w-4" />
                          </div>
                          <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-500">
                            {genre.works_count} ta asar
                          </span>
                        </div>
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <div>
                            <h3 className="font-sans text-base font-bold text-stone-900">
                              {genre.name}
                            </h3>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-500">
                              {genre.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-1" />
                        </div>
                      </Link>
                    ),
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
