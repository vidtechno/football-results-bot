import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BookOpen, ChevronRight, Eye, Users, Sparkles, CheckCircle } from 'lucide-react';
import { getPublicAuthor } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { FollowButton } from '@/components/social/FollowButton';

export const revalidate = 60;

interface AuthorPublicProfilePageProps {
  params: {
    username: string;
  };
}

export async function generateMetadata({ params }: AuthorPublicProfilePageProps): Promise<Metadata> {
  const result = await getPublicAuthor(params.username);
  if (!result || !result.author) {
    return { title: 'Muallif topilmadi' };
  }

  const { author } = result;
  return {
    title: `${author.pen_name} — Muallif profili`,
    description: author.biography || `${author.pen_name}ning Manbora platformasidagi sara kitoblari va hikoyalari.`,
    alternates: {
      canonical: `/mualliflar/${params.username}`,
    },
  };
}

export default async function AuthorPublicProfilePage({
  params,
}: AuthorPublicProfilePageProps) {
  const result = await getPublicAuthor(params.username);

  if (!result || !result.author) {
    notFound();
  }

  const { author, works, totalWorks, totalReads, followerCount } = result;
  const profile = author.profile;

  return (
    <div className="space-y-8 sm:space-y-10 pb-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-[#78716C] font-semibold">
        <Link href="/" className="hover:text-[#B45309]">Bosh sahifa</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E]" />
        <Link href="/mualliflar" className="hover:text-[#B45309]">Mualliflar</Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E]" />
        <span className="text-[#1C1917]">{author.pen_name}</span>
      </nav>

      {/* Author Card */}
      <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-[#B45309] to-[#D97706] text-white flex items-center justify-center text-3xl font-black font-serif shadow-md shadow-[#B45309]/15 overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={author.pen_name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 96px, 112px"
              />
            ) : (
              <span>{author.pen_name.slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#FEF3C7] text-[#92400E] text-xs font-black uppercase tracking-wide border border-[#FDE68A]">
                <CheckCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Tasdiqlangan muallif</span>
              </span>
              {profile?.username && (
                <span className="text-xs text-[#78716C] font-medium">
                  @{profile.username}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight">
              {author.pen_name}
            </h1>

            <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed font-medium max-w-xl">
              {author.biography || 'Muallif hali o‘zi haqida ma’lumot qoldirmagan.'}
            </p>

            {/* Public Statistics */}
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-6 text-xs text-[#78716C] font-bold">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#B45309]" />
                <span>{totalWorks} ta chop etilgan asar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#B45309]" />
                <span>{totalReads.toLocaleString('uz-UZ')} ta mutolaa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#B45309]" />
                <span>{followerCount} ta obunachi</span>
              </div>
            </div>

            {/* Follow Action */}
            <div className="pt-2 flex items-center justify-center sm:justify-start">
              <FollowButton
                type="author"
                targetId={author.user_id}
                initialFollowerCount={followerCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Author Works Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#B45309]" />
            <h2 className="text-lg sm:text-xl font-black font-serif text-[#1C1917] tracking-tight">
              Muallifning asarlari ({works.length})
            </h2>
          </div>
        </div>

        {works.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-[#EAE5DD] text-stone-500 text-xs font-semibold shadow-xs">
            Ushbu muallif hozircha biron asar e’lon qilmagan.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>
        )}
      </section>

      {/* Structured Data (JSON-LD) for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: author.pen_name,
            description: author.biography || undefined,
            image: profile?.avatar_url || undefined,
          }),
        }}
      />
    </div>
  );
}
