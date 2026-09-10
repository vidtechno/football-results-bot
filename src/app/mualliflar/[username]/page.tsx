import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import {
  BookOpen,
  ChevronRight,
  CheckCircle,
  Globe,
  Send,
  Instagram,
  Youtube,
  PenTool,
  PlusCircle,
} from 'lucide-react';
import { getPublicAuthor } from '@/lib/db/queries';
import { FollowButton } from '@/components/social/FollowButton';
import { AuthorProfileFeed } from '@/components/author/AuthorProfileFeed';
import { AuthorConnections } from '@/components/author/AuthorConnections';
import { ProfileShareButton } from '@/components/author/ProfileShareButton';
import { AuthorOwnerPanel } from '@/components/author/AuthorOwnerPanel';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/server';

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
  value?: string | null,
): string | null {
  if (network === 'telegram') return sanitizeTelegram(value);
  if (network === 'instagram') return sanitizeInstagram(value);
  if (network === 'youtube') return sanitizeYoutube(value);
  if (network === 'website') return sanitizeWebsite(value);
  return null;
}

export async function generateMetadata({
  params,
}: AuthorPublicProfilePageProps): Promise<Metadata> {
  const result = await getPublicAuthor(params.username);
  if (!result || !result.author) {
    return { title: 'Muallif topilmadi' };
  }

  const { author } = result;
  return {
    title: `${author.pen_name} — Muallif profili`,
    description:
      author.biography ||
      `${author.pen_name}ning Manbora platformasidagi sara kitoblari va hikoyalari.`,
    alternates: {
      canonical: `/mualliflar/${params.username}`,
    },
  };
}

export default async function AuthorPublicProfilePage({ params }: AuthorPublicProfilePageProps) {
  const result = await getPublicAuthor(params.username);

  if (!result || !result.author) {
    notFound();
  }

  const { author, works, totalWorks, totalReads, followerCount, followingCount } = result;
  const profile = author.profile;
  const currentViewer = await getCurrentProfile();
  const isOwnProfile = currentViewer?.id === author.user_id;

  const admin = getSupabaseAdmin();
  const { data: authorPosts } = await admin
    .from('author_posts')
    .select('id, content, pinned, created_at')
    .eq('author_id', author.id)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

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
        <Link href="/" className="hover:text-[#B45309]">
          Bosh sahifa
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E]" />
        <Link href="/mualliflar" className="hover:text-[#B45309]">
          Mualliflar
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-[#A8A29E]" />
        <span className="text-[#1C1917]">{author.pen_name}</span>
      </nav>

      {/* Author identity */}
      <section className="rounded-[30px] border border-[#E7E0D5] bg-white p-5 shadow-[0_22px_60px_-42px_rgba(28,25,23,0.38)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[112px_minmax(0,1fr)] lg:items-start">
          <div className="relative mx-auto h-28 w-28 overflow-hidden rounded-[26px] border border-stone-200 bg-stone-100 text-stone-800 shadow-md lg:mx-0">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={author.pen_name}
                fill
                className="object-cover"
                sizes="128px"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-black">
                {author.pen_name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-3 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900">
                <CheckCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Tasdiqlangan muallif</span>
              </span>
              {profile?.username && (
                <span className="text-xs font-bold text-stone-500">@{profile.username}</span>
              )}
            </div>

            <h1 className="text-3xl font-black tracking-[-0.035em] text-stone-950 sm:text-4xl">
              {author.pen_name}
            </h1>

            <p className="mx-auto max-w-2xl text-sm font-medium leading-relaxed text-stone-600 lg:mx-0">
              {profile?.bio || author.biography || 'Muallif hali o‘zi haqida ma’lumot qoldirmagan.'}
            </p>

            {socialsList.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 lg:justify-start">
                {socialsList.map((s) => (
                  <a
                    key={s.key}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-3 text-xs font-bold text-stone-700 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
                  >
                    {s.icon}
                    <span>{s.label}</span>
                  </a>
                ))}
              </div>
            )}

            <div className="overflow-x-auto py-1 no-scrollbar">
              <div className="mx-auto flex w-max min-w-full items-center justify-center divide-x divide-stone-200 lg:mx-0 lg:min-w-0 lg:justify-start">
                <a
                  href="#asarlar"
                  className="flex min-h-[52px] min-w-[82px] flex-col items-center justify-center px-3 text-center transition-colors hover:text-amber-800"
                >
                  <strong className="text-xl font-black text-stone-950">{totalWorks}</strong>
                  <span className="text-[11px] font-semibold text-stone-500">Asarlar</span>
                </a>
                <AuthorConnections
                  authorId={author.user_id}
                  followers={followerCount}
                  following={followingCount}
                />
                <div className="flex min-h-[52px] min-w-[82px] flex-col items-center justify-center px-3 text-center">
                  <strong className="text-xl font-black text-stone-950">
                    {totalReads.toLocaleString('uz-UZ')}
                  </strong>
                  <span className="text-[11px] font-semibold text-stone-500">Mutolaa</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:flex-wrap sm:justify-center lg:justify-start">
              {isOwnProfile ? (
                <>
                  <Link
                    href="/muallif"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-xs font-black text-white transition-colors hover:bg-emerald-900"
                  >
                    <PenTool className="h-4 w-4" /> Muallif studiyasi
                  </Link>
                  <Link
                    href="/muallif/asar/yangi"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-xs font-black text-white transition-colors hover:bg-amber-700"
                  >
                    <PlusCircle className="h-4 w-4" /> Asar yaratish
                  </Link>
                  <Link
                    href="/sozlamalar?tab=profile"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-xs font-black text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    Profilni tahrirlash
                  </Link>
                  <ProfileShareButton authorName={author.pen_name} />
                </>
              ) : (
                <FollowButton
                  type="author"
                  targetId={author.user_id}
                  initialFollowerCount={followerCount}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {isOwnProfile && <AuthorOwnerPanel />}

      {/* Author Works & Posts Feed with Tabs and Sharing */}
      <section id="asarlar" className="space-y-4 scroll-mt-24">
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
