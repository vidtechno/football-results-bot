import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  BookOpen,
  ChevronRight,
  Eye,
  Users,
  Sparkles,
  CheckCircle,
  Clock,
  Globe,
  Send,
  Instagram,
  Youtube,
} from 'lucide-react';
import { getPublicAuthor } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { FollowButton } from '@/components/social/FollowButton';
import { AuthorProfileFeed } from '@/components/author/AuthorProfileFeed';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

import {
  sanitizeTelegram,
  sanitizeInstagram,
  sanitizeYoutube,
  sanitizeWebsite,
} from '@/lib/utils/social';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface AuthorPublicProfilePageProps {
  params: {
    username: string;
  };
}

function sanitizeSocialUrl(
  network: 'telegram' | 'instagram' | 'youtube' | 'website',
  value?: string | null
): string | null {
  if (network === 'telegram') return sanitizeTelegram(value);
  if (network === 'instagram') return sanitizeInstagram(value);
  if (network === 'youtube') return sanitizeYoutube(value);
  if (network === 'website') return sanitizeWebsite(value);
  return null;
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

  const admin = getSupabaseAdmin();
  const { data: authorPosts } = await admin
    .from('author_posts')
    .select('id, content, pinned, created_at')
    .eq('author_id', author.id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  // Fetch author's latest published chapters across all works
  const workIds = works.map((w) => w.id);
  let recentChapters: any[] = [];
  if (workIds.length > 0) {
    const { data: chaps } = await admin
      .from('chapters')
      .select('id, work_id, chapter_number, title, slug, published_at, created_at')
      .eq('status', 'published')
      .in('work_id', workIds)
      .order('published_at', { ascending: false })
      .limit(6);

    if (chaps && chaps.length > 0) {
      const workMap = new Map(works.map((w) => [w.id, w]));
      recentChapters = chaps.map((c) => ({
        ...c,
        work: workMap.get(c.work_id),
      }));
    }
  }

  // Parse and prepare social links whitelist
  const rawSocials = (profile?.social_links as any) || {};
  const socialsList: { key: string; label: string; url: string; icon: React.ReactNode }[] = [];

  const tgUrl = sanitizeSocialUrl('telegram', rawSocials.telegram);
  if (tgUrl) {
    socialsList.push({
      key: 'telegram',
      label: 'Telegram',
      url: tgUrl,
      icon: <Send className="w-3.5 h-3.5 text-sky-600" />,
    });
  }

  const instaUrl = sanitizeSocialUrl('instagram', rawSocials.instagram);
  if (instaUrl) {
    socialsList.push({
      key: 'instagram',
      label: 'Instagram',
      url: instaUrl,
      icon: <Instagram className="w-3.5 h-3.5 text-rose-600" />,
    });
  }

  const ytUrl = sanitizeSocialUrl('youtube', rawSocials.youtube);
  if (ytUrl) {
    socialsList.push({
      key: 'youtube',
      label: 'YouTube',
      url: ytUrl,
      icon: <Youtube className="w-3.5 h-3.5 text-red-600" />,
    });
  }

  const webUrl = sanitizeSocialUrl('website', rawSocials.website);
  if (webUrl) {
    socialsList.push({
      key: 'website',
      label: 'Veb-sayt',
      url: webUrl,
      icon: <Globe className="w-3.5 h-3.5 text-emerald-600" />,
    });
  }

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

            {/* Social Links */}
            {socialsList.length > 0 && (
              <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {socialsList.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 hover:bg-amber-50 hover:text-amber-900 border border-stone-200 text-stone-700 text-xs font-bold transition-all shadow-2xs"
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </a>
                ))}
              </div>
            )}

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

      {/* So‘nggi chiqqan boblar */}
      {recentChapters.length > 0 && (
        <section className="bg-white rounded-3xl border border-[#EAE5DD] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="font-serif font-black text-lg text-stone-900">
                So‘nggi chiqqan boblar
              </h2>
            </div>
            <span className="text-[11px] text-stone-500 font-bold">
              {recentChapters.length} ta yangi bob
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentChapters.map((chap) => (
              <Link
                key={chap.id}
                href={`/mutolaa/${chap.work?.slug || chap.work_id}/${chap.id}`}
                className="group block p-3.5 rounded-2xl bg-stone-50 hover:bg-amber-50/60 border border-stone-200/80 hover:border-amber-300/80 transition-all shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium mb-1">
                  <span className="truncate max-w-[140px] font-bold text-amber-800">
                    {chap.work?.title}
                  </span>
                  <span>
                    {new Date(chap.published_at || chap.created_at).toLocaleDateString('uz-UZ')}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-sm text-stone-900 group-hover:text-amber-900 transition-colors line-clamp-1">
                  {chap.chapter_number}-bob: {chap.title}
                </h3>
                <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-700 group-hover:text-amber-800">
                  <span>Mutolaa qilish</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Author Works & Posts Feed with Tabs and Sharing */}
      <section className="space-y-4">
        <AuthorProfileFeed
          works={works}
          posts={authorPosts || []}
          authorPenName={author.pen_name}
          authorUserId={author.user_id}
          authorId={author.id}
        />
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
