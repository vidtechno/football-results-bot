import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  Bookmark,
  BookOpen,
  Clock,
  Heart,
  CheckCircle2,
  Users,
  Compass,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { getCurrentProfile, createServerClient, createAdminClient } from '@/lib/supabase/server';
import { WorkCard } from '@/components/work/WorkCard';
import { FollowButton } from '@/components/social/FollowButton';
import { CataloguePagination } from '@/components/catalogue/CataloguePagination';
import type { Work } from '@/lib/types/platform';

export const revalidate = 0; // Dynamic personal data

export const metadata: Metadata = {
  title: 'Mening kutubxonam',
  description: 'Shaxsiy mutolaa jurnali: o‘qilayotgan, sotib olingan, saqlangan, sevimli asarlar va kuzatilayotgan mualliflar.',
  robots: {
    index: false,
    follow: false,
  },
};

type LibraryTab =
  | 'reading'
  | 'purchased'
  | 'read_later'
  | 'favorite'
  | 'completed'
  | 'followed_works'
  | 'followed_authors';

interface KutubxonaPageProps {
  searchParams: {
    tab?: LibraryTab;
    page?: string;
  };
}

const TABS: Array<{ id: LibraryTab; label: string; icon: any }> = [
  { id: 'reading', label: 'Mutolaada', icon: Clock },
  { id: 'purchased', label: 'Sotib olingan', icon: Lock },
  { id: 'read_later', label: 'Keyinroq o‘qish', icon: Bookmark },
  { id: 'favorite', label: 'Sevimlilar', icon: Heart },
  { id: 'completed', label: 'Tugallangan', icon: CheckCircle2 },
  { id: 'followed_works', label: 'Kuzatuvdagi asarlar', icon: Sparkles },
  { id: 'followed_authors', label: 'Mualliflar', icon: Users },
];

export default async function KutubxonaPage({ searchParams }: KutubxonaPageProps) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return (
      <div className="py-16 sm:py-24 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
          <Bookmark className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-stone-900">
            Shaxsiy kutubxonangiz
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Mutolaa davomiyligi, saqlangan kitoblar, sotib olingan boblar va sevimli mualliflaringizni ko‘rish uchun hisobingizga kiring.
          </p>
        </div>
        <Link
          href="/kirish?redirect=/kutubxona"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs"
        >
          <span>Tizimga kirish</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const activeTab: LibraryTab = searchParams.tab || 'reading';
  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;
  const offset = (currentPage - 1) * pageSize;

  const admin = createAdminClient();

  let items: any[] = [];
  let totalCount = 0;

  if (activeTab === 'reading') {
    // Reading progress items
    const [countRes, dataRes] = await Promise.all([
      admin.from('reading_progress').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
      admin
        .from('reading_progress')
        .select(`
          id, page_index, total_pages, percentage, is_completed, last_read_at,
          work:works (
            *,
            author:author_profiles (pen_name)
          ),
          chapter:chapters (id, chapter_number, title, slug)
        `)
        .eq('user_id', profile.id)
        .order('last_read_at', { ascending: false })
        .range(offset, offset + pageSize - 1),
    ]);
    totalCount = countRes.count || 0;
    items = (dataRes.data || []).filter((i: any) => i.work);
  } else if (activeTab === 'purchased') {
    const [countRes, dataRes] = await Promise.all([
      admin.from('purchases').select('id', { count: 'exact', head: true }).eq('buyer_id', profile.id).eq('status', 'completed'),
      admin
        .from('purchases')
        .select(`
          *,
          work:works (
            *,
            author:author_profiles (pen_name)
          ),
          chapter:chapters (id, chapter_number, title, slug)
        `)
        .eq('buyer_id', profile.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1),
    ]);
    totalCount = countRes.count || 0;
    items = dataRes.data || [];
  } else if (['read_later', 'favorite', 'completed'].includes(activeTab)) {
    const [countRes, dataRes] = await Promise.all([
      admin
        .from('library_items')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('saved_state', activeTab),
      admin
        .from('library_items')
        .select(`
          *,
          work:works (
            *,
            author:author_profiles (pen_name)
          )
        `)
        .eq('user_id', profile.id)
        .eq('saved_state', activeTab)
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1),
    ]);
    totalCount = countRes.count || 0;
    items = (dataRes.data || []).map((i: any) => i.work).filter(Boolean);
  } else if (activeTab === 'followed_works') {
    try {
      const [countRes, dataRes] = await Promise.all([
        admin.from('work_follows').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
        admin
          .from('work_follows')
          .select(`
            id, created_at,
            work:works (
              *,
              author:author_profiles (pen_name)
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1),
      ]);
      totalCount = countRes.count || 0;
      items = (dataRes.data || []).map((i: any) => i.work).filter(Boolean);
    } catch {
      items = [];
      totalCount = 0;
    }
  } else if (activeTab === 'followed_authors') {
    try {
      const [countRes, dataRes] = await Promise.all([
        admin.from('author_follows').select('id', { count: 'exact', head: true }).eq('user_id', profile.id),
        admin
          .from('author_follows')
          .select(`
            id, created_at,
            author:author_profiles (
              user_id, pen_name, biography,
              profile:profiles(id, display_name, username, avatar_url)
            )
          `)
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1),
      ]);
      totalCount = countRes.count || 0;
      items = (dataRes.data || []).map((i: any) => i.author).filter(Boolean);
    } catch {
      items = [];
      totalCount = 0;
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      <div id="library-results-top" />

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight flex items-center gap-2.5">
          <Bookmark className="w-7 h-7 text-amber-600" />
          <span>Mening kutubxonam</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#78716C] font-medium">
          Shaxsiy mutolaa progressi, to‘plamlar va obunalaringiz
        </p>
      </div>

      {/* 7 Tabs Bar */}
      <div className="bg-white p-2 sm:p-2.5 rounded-3xl border border-[#EAE5DD] shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/kutubxona?tab=${tab.id}`}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-bold whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Collection Content */}
      {items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
          <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-stone-800 text-base">Bu bo‘limda hozircha asarlar yo‘q</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Katalogdan yangi kitob va hikoyalarni topib, ularni mutolaa qiling yoki kutubxonangizga saqlang.
          </p>
          <Link
            href="/asarlar"
            className="inline-block px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
          >
            Asarlar katalogiga o‘tish
          </Link>
        </div>
      ) : activeTab === 'reading' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item: any) => {
              const w = item.work;
              const ch = item.chapter;
              const progress = item.percentage || 0;
              const readUrl = ch ? `/asarlar/${w.slug}/${ch.slug}` : `/asarlar/${w.slug}`;

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-3xl border border-[#EAE5DD] flex items-center gap-4 shadow-xs hover:border-amber-400 transition-colors"
                >
                  <div className="relative w-16 h-24 rounded-2xl bg-stone-100 overflow-hidden shrink-0 shadow-2xs border border-stone-200">
                    {w.cover_url ? (
                      <Image src={w.cover_url} alt={w.title} fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="font-serif font-bold text-stone-900 text-sm truncate">{w.title}</h3>
                    <p className="text-xs text-stone-500 truncate">{w.author?.pen_name || 'Muallif'}</p>
                    {ch && (
                      <p className="text-[11px] text-amber-800 font-semibold truncate">
                        {ch.chapter_number}-bob: {ch.title}
                      </p>
                    )}

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold">
                        <span>Mutolaa</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full transition-all" style={{ width: `${Math.max(5, progress)}%` }} />
                      </div>
                    </div>

                    <Link
                      href={readUrl}
                      className="inline-block mt-2 px-3 py-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] transition-colors"
                    >
                      Davom ettirish
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            scrollTargetId="library-results-top"
          />
        </div>
      ) : activeTab === 'purchased' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p: any) => {
              const w = p.work;
              const ch = p.chapter;
              const readUrl = ch ? `/asarlar/${w?.slug}/${ch.slug}` : `/asarlar/${w?.slug}`;

              return (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-3xl border border-[#EAE5DD] flex items-center gap-4 shadow-xs"
                >
                  <div className="relative w-14 h-20 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                    {w?.cover_url ? (
                      <Image src={w.cover_url} alt={w.title || ''} fill className="object-cover" sizes="56px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase">
                      Cheksiz kirish
                    </span>
                    <h3 className="font-serif font-bold text-stone-900 text-sm truncate">{w?.title}</h3>
                    {ch ? (
                      <p className="text-xs text-stone-500 truncate">{ch.chapter_number}-bob: {ch.title}</p>
                    ) : (
                      <p className="text-xs text-stone-500">To‘liq asar sotib olingan</p>
                    )}
                    <Link
                      href={readUrl}
                      className="inline-block mt-1 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors"
                    >
                      O‘qish
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            scrollTargetId="library-results-top"
          />
        </div>
      ) : activeTab === 'followed_authors' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((author: any) => {
              const prof = author.profile;
              const authorUrl = prof?.username ? `/mualliflar/${prof.username}` : `/mualliflar/${author.user_id}`;

              return (
                <div
                  key={author.user_id}
                  className="bg-white p-5 rounded-3xl border border-[#EAE5DD] shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white font-serif font-black flex items-center justify-center text-lg overflow-hidden shrink-0 shadow-xs">
                      {prof?.avatar_url ? (
                        <Image src={prof.avatar_url} alt={author.pen_name} fill className="object-cover" sizes="56px" />
                      ) : (
                        <span>{author.pen_name.slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-serif font-bold text-stone-900 text-sm truncate">{author.pen_name}</h3>
                      {prof?.username && <p className="text-xs text-stone-500 truncate">@{prof.username}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <Link href={authorUrl} className="font-bold text-amber-700 hover:underline">
                      Profilni ko‘rish
                    </Link>
                    <FollowButton type="author" targetId={author.user_id} initialIsFollowing={true} variant="compact" showCount={false} />
                  </div>
                </div>
              );
            })}
          </div>

          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            scrollTargetId="library-results-top"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4.5">
            {items.map((work: Work) => (
              <WorkCard key={work.id} work={work} context="catalogue" />
            ))}
          </div>

          <CataloguePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            scrollTargetId="library-results-top"
          />
        </div>
      )}
    </div>
  );
}
