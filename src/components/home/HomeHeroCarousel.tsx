'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Clock,
  Star,
  PenTool,
  ArrowRight,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Work } from '@/lib/types/platform';
import { getRelativeTimeString } from '@/lib/utils/formatters';
import type { RecentReadingProgressDTO } from '@/lib/services/progress';
import { getPublicWorkAuthorName } from '@/lib/utils/workAttribution';

interface HomeHeroCarouselProps {
  recentlyUpdatedWork?: Work | null;
  editorChoiceWork?: Work | null;
  popularWork?: Work | null;
}

export function HomeHeroCarousel({
  recentlyUpdatedWork,
  editorChoiceWork,
  popularWork,
}: HomeHeroCarouselProps) {
  const { user, author } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [continueReading, setContinueReading] = useState<RecentReadingProgressDTO | null>(null);
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch authenticated reader progress client-side (guaranteeing zero static cached progress leakage)
  useEffect(() => {
    let isCancelled = false;

    if (!user) {
      setContinueReading(null);
      setHasLoadedProgress(true);
      return;
    }

    setHasLoadedProgress(false);
    fetch('/api/library/continue-reading')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isCancelled) return;
        if (data && data.primaryItem) {
          setContinueReading(data.primaryItem);
        } else {
          setContinueReading(null);
        }
        setHasLoadedProgress(true);
      })
      .catch(() => {
        if (!isCancelled) {
          setContinueReading(null);
          setHasLoadedProgress(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const isAuthor = Boolean(author && author.status === 'approved');

  // Build slides dynamically
  const slides = [];

  // Slide 1: Continue Reading OR Discovery Fallback
  if (continueReading) {
    const chapterLabel = continueReading.chapterTitle
      ? `${continueReading.chapterNumber}-bob: ${continueReading.chapterTitle}`
      : 'Mutolaa sahifasi';

    slides.push({
      id: 'continue-reading',
      type: 'continue-reading',
      badge: 'Mutolaani davom ettirish',
      badgeIcon: Clock,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      title: continueReading.workTitle,
      subtitle: continueReading.authorName,
      extraInfo: `${chapterLabel} • ${continueReading.pageNumber}-sahifa (${continueReading.progressPercent}%)`,
      timeLabel: continueReading.lastReadLabel,
      ctaText: 'Mutolaani davom ettirish',
      ctaHref: continueReading.resumeUrl,
      coverUrl: continueReading.coverUrl,
      progressPercent: continueReading.progressPercent,
    });
  } else {
    // Guest or no active reading progress -> Discovery Slide
    const fallbackWork = popularWork || editorChoiceWork;
    slides.push({
      id: 'discovery',
      type: 'discovery',
      badge: 'Yangi asarlar maydoni',
      badgeIcon: Sparkles,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
      title: fallbackWork ? fallbackWork.title : 'O‘zbek adabiyoti va zamonaviy asarlar',
      subtitle: fallbackWork
        ? getPublicWorkAuthorName(fallbackWork)
        : 'Mualliflar bilan kitobxonlar birlashgan platforma',
      extraInfo: fallbackWork?.description
        ? fallbackWork.description.slice(0, 120) + '...'
        : 'Mustaqil mualliflar asarlarini bobma-bob serial mutolaa qiling va yangi boblarni birinchilardan bo‘lib o‘qing.',
      ctaText: fallbackWork ? 'Asarni o‘qish' : 'Katalogga o‘tish',
      ctaHref: fallbackWork ? `/asarlar/${fallbackWork.slug}` : '/asarlar',
      coverUrl: fallbackWork?.cover_url || null,
    });
  }

  // Slide 2: Recently Updated Serialized Work
  if (recentlyUpdatedWork) {
    const authorName = getPublicWorkAuthorName(recentlyUpdatedWork);
    const updateTime = getRelativeTimeString(recentlyUpdatedWork.updated_at || recentlyUpdatedWork.published_at || '');

    slides.push({
      id: 'recently-updated',
      type: 'recently-updated',
      badge: 'Yangi boblar chiqdi',
      badgeIcon: Flame,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
      title: recentlyUpdatedWork.title,
      subtitle: authorName,
      extraInfo: `Yaqinda yangilangan davomli asar • So‘nggi yangilanish: ${updateTime}`,
      timeLabel: `${updateTime} yangilandi`,
      ctaText: 'Yangi bobni o‘qish',
      ctaHref: `/asarlar/${recentlyUpdatedWork.slug}`,
      coverUrl: recentlyUpdatedWork.cover_url,
    });
  }

  // Slide 3: Editor's Choice
  if (editorChoiceWork) {
    const authorName = getPublicWorkAuthorName(editorChoiceWork);
    const genreName =
      (editorChoiceWork as any).genre?.name ||
      (Array.isArray(editorChoiceWork.genres) && editorChoiceWork.genres[0]?.name) ||
      (Array.isArray((editorChoiceWork as any).work_genres) && (editorChoiceWork as any).work_genres[0]?.genre?.name) ||
      'Adabiyot';
    const rating = editorChoiceWork.average_rating || (editorChoiceWork as any).rating || 5.0;

    slides.push({
      id: 'editor-choice',
      type: 'editor-choice',
      badge: 'Muharrir tanlovi',
      badgeIcon: Star,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
      title: editorChoiceWork.title,
      subtitle: `${authorName} • ${genreName}`,
      extraInfo: editorChoiceWork.description
        ? editorChoiceWork.description.slice(0, 130) + '...'
        : 'Manbora tahririyati tomonidan mutolaa uchun maxsus tavsiya etilgan asar.',
      rating: Number(rating).toFixed(1),
      ctaText: 'Asarni ko‘rish',
      ctaHref: `/asarlar/${editorChoiceWork.slug}`,
      coverUrl: editorChoiceWork.cover_url,
    });
  }

  // Slide 4: Become an Author / Creator
  slides.push({
    id: 'author-onboarding',
    type: 'author-onboarding',
    badge: 'Mualliflar uchun',
    badgeIcon: PenTool,
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    title: 'O‘z hikoyangizni millionlab kitobxonlarga taqdim eting',
    subtitle: 'Manbora mualliflik dasturi',
    extraInfo:
      'Asaringizni bobma-bob nashr qiling, batafsil o‘quvchilar analitikasini kuzating va har bir sotuvdan kafolatlangan daromad oling.',
    ctaText: isAuthor ? 'Asar yaratishni boshlash' : 'Muallif bo‘lish',
    ctaHref: isAuthor ? '/muallif/asar/yangi' : '/muallif-boling',
    coverUrl: null,
  });

  const totalSlides = slides.length;

  // Auto-advance rotation (6-8 seconds, 7000ms default)
  useEffect(() => {
    // Respect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    if (isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 7000);

    return () => clearInterval(timer);
  }, [isPaused, totalSlides]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNextSlide();
    }
  };

  // Touch Swipe Handlers for mobile & tablet
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 40) {
      // Swiped left -> next slide
      goToNextSlide();
    } else if (diff < -40) {
      // Swiped right -> prev slide
      goToPrevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const activeSlide = slides[currentSlide] || slides[0];
  const BadgeIcon = activeSlide.badgeIcon;

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="literary-carousel relative w-full h-[340px] sm:h-[380px] lg:h-[420px] rounded-[2rem] overflow-hidden border border-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 bg-stone-950 select-none"
      aria-roledescription="carousel"
      aria-label="Manbora asarlar karuseli"
    >
      {/* Background Layer: Cover Art with Rich Dark Gradient Overlay */}
      {activeSlide.coverUrl ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={activeSlide.coverUrl}
            alt={activeSlide.title}
            fill
            priority
            className="object-cover object-center blur-sm scale-110 opacity-35 transition-all duration-1000"
          />
          {/* Gradients ensuring high contrast text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/85 to-stone-950/40 lg:bg-gradient-to-r lg:from-stone-950 lg:via-stone-950/90 lg:to-emerald-950/30" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-stone-950 via-emerald-950/80 to-stone-900" />
      )}

      <div className="hero-orb hero-orb-one" aria-hidden="true" />
      <div className="hero-orb hero-orb-two" aria-hidden="true" />
      <div className="absolute inset-0 z-[1] opacity-[0.045] literary-grain" aria-hidden="true" />

      {/* Slide Content */}
      <div className="relative z-10 w-full h-full p-6 sm:p-8 lg:p-12 flex flex-col justify-between">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md',
              activeSlide.badgeColor,
            )}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{activeSlide.badge}</span>
          </div>

          {activeSlide.rating && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-900/80 border border-stone-700 text-amber-300 text-xs font-black backdrop-blur-md">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{activeSlide.rating}</span>
            </div>
          )}

          {activeSlide.timeLabel && (
            <span className="text-[11px] text-stone-400 font-medium hidden sm:inline-block">
              {activeSlide.timeLabel}
            </span>
          )}
        </div>

        {/* Center Text and Actions */}
        <div key={activeSlide.id} className="hero-copy max-w-2xl lg:max-w-[62%] space-y-2 sm:space-y-3 my-auto">
          <h2 className="font-sans text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-[-0.035em] leading-[1.08] line-clamp-2 text-balance">
            {activeSlide.title}
          </h2>

          <p className="text-xs sm:text-sm font-semibold text-emerald-300 truncate">
            {activeSlide.subtitle}
          </p>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-normal line-clamp-2 sm:line-clamp-3">
            {activeSlide.extraInfo}
          </p>

          {/* Optional Progress Bar for Continue Reading */}
          {typeof activeSlide.progressPercent === 'number' && (
            <div className="pt-1 max-w-sm">
              <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden border border-stone-700">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, activeSlide.progressPercent))}%` }}
                />
              </div>
            </div>
          )}

          {/* One-Click CTA Button */}
          <div className="pt-3 flex items-center gap-3">
            <Link
              href={activeSlide.ctaHref}
              className="hero-cta inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all duration-200 shadow-lg shadow-emerald-950/30 group active:scale-98"
            >
              <span>{activeSlide.ctaText}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>

        {activeSlide.coverUrl && (
          <div key={`${activeSlide.id}-cover`} className="hero-book absolute right-[8%] top-1/2 hidden lg:block h-[270px] w-[180px] -translate-y-1/2">
            <div className="relative h-full w-full overflow-hidden rounded-[1.15rem] border border-white/20 bg-stone-800 shadow-2xl shadow-black/50">
              <Image src={activeSlide.coverUrl} alt="" fill sizes="180px" className="object-cover" />
              <div className="absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/35 to-transparent" />
            </div>
          </div>
        )}

        {/* Bottom Carousel Controls: Prev/Next & Slide Indicators */}
        <div className="flex items-center justify-between pt-2">
          {/* Clickable Indicators */}
          <div className="flex items-center gap-2" role="tablist" aria-label="Slaydlar">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-selected={currentSlide === idx}
                aria-label={`Slayd ${idx + 1}`}
                role="tab"
                className={clsx(
                  'h-2 rounded-full transition-all duration-300',
                  currentSlide === idx
                    ? 'w-7 bg-emerald-400'
                    : 'w-2 bg-stone-600 hover:bg-stone-400',
                )}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goToPrevSlide}
              aria-label="Oldingi slayd"
              className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToNextSlide}
              aria-label="Keyingi slayd"
              className="p-2 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
