import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { User, BookOpen, ChevronRight, PenTool } from 'lucide-react';
import { getAuthorByUsername } from '@/lib/db/queries';
import { WorkGrid } from '@/components/works/WorkGrid';

export const revalidate = 60;

interface AuthorPublicProfilePageProps {
  params: {
    username: string;
  };
}

export default async function AuthorPublicProfilePage({
  params,
}: AuthorPublicProfilePageProps) {
  const { author, works } = await getAuthorByUsername(params.username);

  if (!author) {
    notFound();
  }

  const profile = author.profile;

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
        <Link href="/" className="hover:text-blue-600">Bosh sahifa</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800">Muallif: {author.pen_name}</span>
      </nav>

      {/* Author Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-md shadow-blue-600/20 overflow-hidden flex-shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={author.pen_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{author.pen_name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-black uppercase tracking-wide border border-blue-200/60">
                Tasdiqlangan muallif
              </span>
              {profile?.username && (
                <span className="text-xs text-slate-400 font-medium">
                  @{profile.username}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {author.pen_name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-xl">
              {author.biography || 'Muallif hali o‘zi haqida ma’lumot qoldirmagan.'}
            </p>

            <div className="pt-2 flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 font-bold">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>{works.length} ta e’lon qilingan asar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Author Works Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Muallifning asarlari
          </h2>
        </div>

        <WorkGrid
          works={works}
          emptyMessage="Ushbu muallif hozircha biron asar e’lon qilmagan."
        />
      </section>
    </div>
  );
}
