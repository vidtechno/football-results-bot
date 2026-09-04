import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Compass,
  PenTool,
  ArrowRight,
  Sparkles,
  Bookmark,
  TrendingUp,
  Award,
  Clock,
  User,
  CheckCircle2,
} from 'lucide-react';
import { getPublishedWorks, getActiveGenres } from '@/lib/db/queries';
import { getCurrentProfile, createServerClient } from '@/lib/supabase/server';
import { WorkGrid } from '@/components/works/WorkGrid';
import { formatUZS } from '@/lib/utils/currency';

export const revalidate = 60; // Revalidate every minute

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const supabase = createServerClient();

  const [allWorks, genres, authorList] = await Promise.all([
    getPublishedWorks({ limit: 16 }),
    getActiveGenres(),
    supabase
      .from('author_profiles')
      .select(`
        user_id,
        pen_name,
        biography,
        profile:profiles(id, display_name, username, avatar_url)
      `)
      .eq('status', 'approved')
      .limit(4),
  ]);

  // If user signed in, load active reading items
  let continueReadingItems: any[] = [];
  if (profile) {
    try {
      const { data: libData } = await supabase
        .from('library_items')
        .select(`
          work_id,
          saved_state,
          reading_progress,
          updated_at,
          work:works (
            id, title, slug, cover_url, access_type, type,
            author:author_profiles (pen_name)
          ),
          last_chapter:chapters!last_read_chapter_id (
            id, chapter_number, title, slug
          )
        `)
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(3);

      continueReadingItems = (libData || []).filter((item: any) => item.work);
    } catch {
      // ignore
    }
  }

  const featuredWorks = allWorks.slice(0, 4);
  const serializedStories = allWorks.filter((w) => w.type === 'serialized_story').slice(0, 4);
  const newWorks = allWorks.filter((w) => w.type === 'book').slice(0, 4);
  const authors = (authorList.data || []) as any[];

  return (
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/* 1. Literary Hero Section */}
      <section className="bg-literary-hero text-white rounded-3xl p-7 sm:p-12 lg:p-16 shadow-xl overflow-hidden border border-stone-800">
        <div className="relative z-10 max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>O‘zbek kitob va davomli asarlar platformasi</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] text-stone-100">
            Adabiyot sehri, yangi qissalar va samimiy mutolaa
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
            Manborada sara kitoblar, yangi boblari muntazam chiqib turadigan serialized asarlar va mustaqil o‘zbek mualliflarining ijod namunalarini qulaylik bilan o‘qing.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <Link
              href="/asarlar"
              className="px-6 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-stone-950" />
              <span>Asarlarni kashf qilish</span>
            </Link>

            <Link
              href="/muallif"
              className="px-6 py-3.5 rounded-2xl bg-stone-800/90 hover:bg-stone-800 text-stone-200 border border-stone-700 font-semibold text-xs sm:text-sm active:scale-95 transition-all flex items-center gap-2 backdrop-blur-xs"
            >
              <PenTool className="w-4 h-4 text-amber-400" />
              <span>Asar e’lon qilish</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Continue Reading (Signed-In Readers Only) */}
      {continueReadingItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-700" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                O‘qishni davom ettiring
              </h2>
            </div>
            <Link
              href="/kutubxona"
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <span>Kutubxonam</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueReadingItems.map((item) => {
              const w = item.work;
              const chap = item.last_chapter;
              const readUrl = chap ? `/asarlar/${w.slug}/${chap.slug}` : `/asarlar/${w.slug}`;

              return (
                <Link
                  key={item.work_id}
                  href={readUrl}
                  className="editorial-card group p-4 flex items-center gap-3.5 bg-white rounded-2xl border border-stone-200 hover:border-amber-700/40 transition-all shadow-xs"
                >
                  <div className="w-14 h-20 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 relative book-cover-shadow">
                    {w.cover_url ? (
                      <Image
                        src={w.cover_url}
                        alt={w.title}
                        fill
                        sizes="60px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="font-serif font-bold text-stone-900 text-sm truncate group-hover:text-amber-900 transition-colors">
                      {w.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 font-medium truncate">
                      {w.author?.pen_name || 'Muallif'}
                    </p>
                    {chap && (
                      <p className="text-[11px] text-amber-800 font-semibold truncate">
                        {chap.chapter_number}-bob: {chap.title}
                      </p>
                    )}
                    <span className="inline-block text-[10px] font-bold text-stone-700 underline pt-0.5">
                      Davom ettirish →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Popular Genres Carousel */}
      {genres.length > 0 && (
        <section id="janrlar" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-amber-800" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Mashhur janrlar
              </h2>
            </div>
            <Link
              href="/asarlar"
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <span>Barcha asarlar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {genres.map((genre) => (
              <Link
                key={genre.id}
                href={`/asarlar?genre=${genre.slug}`}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-white border border-stone-200/90 hover:border-amber-700/40 hover:bg-amber-50/50 text-stone-700 text-xs font-bold transition-all shadow-2xs whitespace-nowrap"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 4. Featured or Recommended Works */}
      {featuredWorks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-800" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Tavsiya etilgan asarlar
              </h2>
            </div>
            <Link
              href="/asarlar"
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <span>Barchasi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <WorkGrid works={featuredWorks} />
        </section>
      )}

      {/* 5. Recently Updated Serialized Stories */}
      {serializedStories.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-700" />
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Davomli asarlar (Seriallar)
                </h2>
                <p className="text-[11px] text-stone-500 font-medium">
                  Har haftada yangi boblar qo‘shilib boradigan qiziqarli qissalar
                </p>
              </div>
            </div>
            <Link
              href="/asarlar?type=serialized_story"
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 flex-shrink-0"
            >
              <span>Ko‘rish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <WorkGrid works={serializedStories} />
        </section>
      )}

      {/* 6. New Works */}
      {newWorks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-800" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Yangi kitoblar
              </h2>
            </div>
            <Link
              href="/asarlar?type=book"
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <span>Barcha kitoblar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <WorkGrid works={newWorks} />
        </section>
      )}

      {/* 7. Featured Authors */}
      {authors.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-800" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Sara mualliflar
              </h2>
            </div>
            <Link
              href="/mualliflar"
              className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1"
            >
              <span>Barcha mualliflar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {authors.map((a) => {
              const profileData = a.profile;
              return (
                <Link
                  key={a.user_id}
                  href={`/mualliflar/${profileData?.username || a.user_id}`}
                  className="editorial-card group p-4 rounded-2xl bg-white border border-stone-200/90 hover:border-amber-700/40 flex items-center gap-3.5 transition-all shadow-xs"
                >
                  <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center font-serif font-bold text-stone-700 flex-shrink-0">
                    {profileData?.avatar_url ? (
                      <Image
                        src={profileData.avatar_url}
                        alt={a.pen_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{a.pen_name?.slice(0, 1).toUpperCase() || 'M'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif font-bold text-stone-900 text-sm truncate group-hover:text-amber-900 transition-colors">
                      {a.pen_name}
                    </h4>
                    <p className="text-[11px] text-stone-400 font-medium truncate">
                      @{profileData?.username || 'muallif'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 8. Invitation for Authors to Publish on Manbora */}
      <section className="p-8 sm:p-12 rounded-3xl bg-stone-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-stone-800">
        <div className="space-y-2 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-400/25">
            <Award className="w-3.5 h-3.5" />
            <span>Mualliflar uchun ochiq platforma</span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
            O‘z kitob va hikoyalaringizni Manborada nashr qiling
          </h3>
          <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
            Kitobxonlar auditoriyasini qozoning, asaringizni bepul yoki pullik formatda taqdim eting va har bir kitobxon xarididan 80% sof daromad oling.
          </p>
        </div>

        <Link
          href="/muallif"
          className="px-7 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-950/30 active:scale-95 transition-all flex-shrink-0 flex items-center gap-2"
        >
          <span>Muallif studiyasiga o‘tish</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}
