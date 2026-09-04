'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Type,
  ArrowLeft,
  BookOpen,
  Sun,
  Moon,
  Coffee,
  ListFilter,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Work, Chapter } from '@/lib/types/platform';
import { PaywallUnlockCard } from './PaywallUnlockCard';

interface ReaderViewProps {
  work: Work;
  currentChapter: Chapter;
  allChapters: Chapter[];
  hasAccess: boolean;
  userBalance?: number;
  isLoggedIn: boolean;
}

type ReaderTheme = 'light' | 'sepia' | 'dark';
type FontFamily = 'serif' | 'sans';
type LineHeight = 'normal' | 'relaxed' | 'loose';
type ContentWidth = 'narrow' | 'medium' | 'wide';

export function ReaderView({
  work,
  currentChapter,
  allChapters,
  hasAccess,
  userBalance = 0,
  isLoggedIn,
}: ReaderViewProps) {
  const router = useRouter();

  // Reader Preferences (Persisted locally)
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [fontFamily, setFontFamily] = useState<FontFamily>('serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<LineHeight>('relaxed');
  const [contentWidth, setContentWidth] = useState<ContentWidth>('medium');

  // UI Drawer & Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const lastProgressRef = useRef<number>(0);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('manbora_reader_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        if (parsed.fontSize) setFontSize(Number(parsed.fontSize));
        if (parsed.lineHeight) setLineHeight(parsed.lineHeight);
        if (parsed.contentWidth) setContentWidth(parsed.contentWidth);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save preferences on change
  const savePrefs = useCallback(
    (newPrefs: Partial<{ theme: ReaderTheme; fontFamily: FontFamily; fontSize: number; lineHeight: LineHeight; contentWidth: ContentWidth }>) => {
      try {
        const current = {
          theme,
          fontFamily,
          fontSize,
          lineHeight,
          contentWidth,
          ...newPrefs,
        };
        localStorage.setItem('manbora_reader_prefs', JSON.stringify(current));
      } catch {
        // ignore
      }
    },
    [theme, fontFamily, fontSize, lineHeight, contentWidth],
  );

  // Chapter indices
  const currentIndex = allChapters.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;

  // Track scroll progress & persist to database
  useEffect(() => {
    function handleScroll() {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const progress = Math.min(100, Math.max(0, Math.round((window.scrollY / totalHeight) * 100)));
      setScrollProgress(progress);

      // Debounce saving progress if changed significantly
      if (Math.abs(progress - lastProgressRef.current) >= 15 && isLoggedIn) {
        lastProgressRef.current = progress;
        fetch('/api/library/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workId: work.id,
            chapterId: currentChapter.id,
            progress,
          }),
        }).catch(() => {});
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [work.id, currentChapter.id, isLoggedIn]);

  // Keyboard navigation using Next.js client router (no full reload!)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft' && prevChapter) {
        router.push(`/asarlar/${work.slug}/${prevChapter.slug}`);
      } else if (e.key === 'ArrowRight' && nextChapter) {
        router.push(`/asarlar/${work.slug}/${nextChapter.slug}`);
      } else if (e.key === 'Escape') {
        setShowSettings(false);
        setShowToc(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, work.slug, router]);

  // Width container classes
  const widthClasses = {
    narrow: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-4xl',
  }[contentWidth];

  const themeClass = `reader-theme-${theme}`;

  return (
    <div className={clsx('min-h-screen transition-colors duration-200 antialiased selection:bg-amber-200 selection:text-amber-950 pb-32', themeClass)}>
      {/* Scroll Progress Bar at very top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-black/5">
        <div
          className="h-full bg-amber-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Sticky Reader Header Toolbar */}
      <header className="sticky top-0 z-40 reader-bar glass-header border-b px-4 py-2.5 transition-colors duration-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back to Work Detail */}
          <Link
            href={`/asarlar/${work.slug}`}
            className="flex items-center gap-1.5 text-xs font-bold opacity-80 hover:opacity-100 transition-opacity truncate"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-xs">{work.title}</span>
          </Link>

          {/* Reader Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Table of Contents Button */}
            <button
              type="button"
              onClick={() => {
                setShowToc(true);
                setShowSettings(false);
              }}
              className="p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 opacity-85 hover:opacity-100 transition-opacity"
              title="Mundarija"
              aria-label="Mundarija"
            >
              <ListFilter className="w-4 h-4" />
              <span className="hidden sm:inline">Mundarija</span>
            </button>

            {/* Typography & Display Settings Button */}
            <button
              type="button"
              onClick={() => {
                setShowSettings(!showSettings);
                setShowToc(false);
              }}
              className={clsx(
                'p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                showSettings
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'opacity-85 hover:opacity-100',
              )}
              title="O‘qish sozlamalari"
              aria-label="Sozlamalar"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Sozlamalar</span>
            </button>
          </div>
        </div>

        {/* Settings Drawer Popover */}
        {showSettings && (
          <div className="max-w-2xl mx-auto mt-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
              <span className="text-xs font-serif font-bold text-stone-900 dark:text-stone-100">Mutolaa sozlamalari</span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme selector */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-stone-500 font-medium">Rang mavzusi:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    savePrefs({ theme: 'light' });
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl border flex items-center gap-1 font-semibold transition-all',
                    theme === 'light'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 shadow-2xs'
                      : 'bg-stone-50 border-stone-200 text-stone-600',
                  )}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                  <span>Yorug‘</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTheme('sepia');
                    savePrefs({ theme: 'sepia' });
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl border flex items-center gap-1 font-semibold transition-all',
                    theme === 'sepia'
                      ? 'bg-[#EBDDBC] border-[#C8B690] text-[#382A1A] shadow-2xs'
                      : 'bg-[#FAF2DF] border-[#E8DEC7] text-[#58442E]',
                  )}
                >
                  <Coffee className="w-3.5 h-3.5 text-[#8C6B45]" />
                  <span>Sepiya</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    savePrefs({ theme: 'dark' });
                  }}
                  className={clsx(
                    'px-3 py-1.5 rounded-xl border flex items-center gap-1 font-semibold transition-all',
                    theme === 'dark'
                      ? 'bg-stone-800 border-stone-600 text-stone-100 shadow-2xs'
                      : 'bg-stone-900 border-stone-800 text-stone-400',
                  )}
                >
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Qorong‘u</span>
                </button>
              </div>
            </div>

            {/* Font Family selector */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-stone-500 font-medium">Shrift turi:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setFontFamily('serif');
                    savePrefs({ fontFamily: 'serif' });
                  }}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl border font-serif transition-all',
                    fontFamily === 'serif'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 font-bold'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300',
                  )}
                >
                  Serif (Badiiy)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontFamily('sans');
                    savePrefs({ fontFamily: 'sans' });
                  }}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-xl border font-sans transition-all',
                    fontFamily === 'sans'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 font-bold'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300',
                  )}
                >
                  Sans (Zamonaviy)
                </button>
              </div>
            </div>

            {/* Font Size control */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-stone-500 font-medium">Shrift hajmi:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(14, fontSize - 2);
                    setFontSize(next);
                    savePrefs({ fontSize: next });
                  }}
                  className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-bold flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  A-
                </button>
                <span className="w-10 text-center font-mono font-bold text-stone-900 dark:text-stone-100">
                  {fontSize}px
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(26, fontSize + 2);
                    setFontSize(next);
                    savePrefs({ fontSize: next });
                  }}
                  className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-100 font-bold flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  A+
                </button>
              </div>
            </div>

            {/* Line Height & Width */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Oraliq:</span>
                {(['normal', 'relaxed', 'loose'] as const).map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setLineHeight(h);
                      savePrefs({ lineHeight: h });
                    }}
                    className={clsx(
                      'px-2 py-1 rounded-lg border text-[11px] capitalize',
                      lineHeight === h
                        ? 'bg-amber-100/80 border-amber-400 text-stone-900 font-bold'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500',
                    )}
                  >
                    {h === 'normal' ? 'Qisqa' : h === 'relaxed' ? 'O‘rta' : 'Keng'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-medium">Maydon:</span>
                {(['narrow', 'medium', 'wide'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setContentWidth(w);
                      savePrefs({ contentWidth: w });
                    }}
                    className={clsx(
                      'px-2 py-1 rounded-lg border text-[11px] capitalize',
                      contentWidth === w
                        ? 'bg-amber-100/80 border-amber-400 text-stone-900 font-bold'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500',
                    )}
                  >
                    {w === 'narrow' ? 'Tor' : w === 'medium' ? 'O‘rta' : 'Keng'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Table of Contents Drawer Modal */}
      {showToc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 p-5 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">
                    Mundarija
                  </h3>
                  <span className="text-xs text-stone-400">{allChapters.length} ta bob</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowToc(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {allChapters.map((chap) => {
                  const isCurrent = chap.id === currentChapter.id;
                  return (
                    <Link
                      key={chap.id}
                      href={`/asarlar/${work.slug}/${chap.slug}`}
                      onClick={() => setShowToc(false)}
                      className={clsx(
                        'flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors',
                        isCurrent
                          ? 'bg-amber-100/90 dark:bg-amber-950/60 font-bold text-amber-950 dark:text-amber-200'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 font-mono text-stone-400 text-[11px]">
                          {chap.chapter_number}.
                        </span>
                        <span className="truncate">{chap.title}</span>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        {chap.is_free ? (
                          <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 mt-6">
              <Link
                href={`/asarlar/${work.slug}`}
                className="w-full py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Asar sahifasiga qaytish</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Reading Content Container */}
      <main className={clsx('mx-auto px-4 sm:px-8 py-8 sm:py-16', widthClasses)}>
        {/* Chapter Header */}
        <header className="mb-10 sm:mb-14 text-center border-b border-stone-200/60 dark:border-stone-800 pb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 block font-serif">
            {currentChapter.chapter_number}-bob
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight leading-snug">
            {currentChapter.title}
          </h1>
        </header>

        {/* Chapter Body or Paywall Unlock Card */}
        {hasAccess ? (
          <article
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight === 'normal' ? 1.55 : lineHeight === 'relaxed' ? 1.85 : 2.15,
              fontFamily:
                fontFamily === 'serif'
                  ? 'var(--font-serif-family)'
                  : 'var(--font-sans-family)',
            }}
            className="reader-article selection:bg-amber-200 selection:text-amber-950 font-normal leading-relaxed space-y-6"
            dangerouslySetInnerHTML={{ __html: currentChapter.content || '' }}
          />
        ) : (
          <PaywallUnlockCard
            workId={work.id}
            chapterId={currentChapter.id}
            chapterTitle={currentChapter.title}
            price={currentChapter.price}
            userBalance={userBalance}
            isLoggedIn={isLoggedIn}
          />
        )}

        {/* Bottom Navigation Buttons between chapters */}
        <nav
          className="mt-16 pt-8 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-3"
          aria-label="Boblar bo‘ylab harakatlanish"
        >
          {prevChapter ? (
            <Link
              href={`/asarlar/${work.slug}/${prevChapter.slug}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 font-bold text-xs sm:text-sm shadow-xs hover:border-amber-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Oldingi bob</span>
              <span className="sm:hidden">Oldingi</span>
            </Link>
          ) : (
            <div />
          )}

          <Link
            href={`/asarlar/${work.slug}`}
            className="flex items-center gap-1.5 text-xs font-serif font-bold opacity-75 hover:opacity-100"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Mundarija</span>
          </Link>

          {nextChapter ? (
            <Link
              href={`/asarlar/${work.slug}/${nextChapter.slug}`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
            >
              <span className="hidden sm:inline">Keyingi bob</span>
              <span className="sm:hidden">Keyingi</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </main>
    </div>
  );
}
