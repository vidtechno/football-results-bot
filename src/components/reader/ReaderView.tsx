'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  CheckCircle2,
  PenTool,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Work, Chapter } from '@/lib/types/platform';
import type { ChapterAccessReason, ChapterAccessStatus } from '@/lib/security/access';
import { formatUZS } from '@/lib/utils/currency';
import { paginateChapterContent } from '@/lib/reader/pagination';
import { PaywallUnlockCard } from './PaywallUnlockCard';

interface ReaderViewProps {
  work: Work;
  currentChapter: Chapter;
  allChapters: Chapter[];
  hasAccess: boolean;
  accessReason?: ChapterAccessReason;
  userBalance?: number;
  isLoggedIn: boolean;
  chapterAccessMap?: Record<string, ChapterAccessStatus>;
  savedProgress?: { pageIndex: number; percentage: number; chapterId: string } | null;
  initialPage?: number;
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
  accessReason = 'locked',
  userBalance = 0,
  isLoggedIn,
  chapterAccessMap = {},
  savedProgress = null,
  initialPage,
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

  // Chapter indices
  const currentIndex = allChapters.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;

  // Next chapter lock status
  const nextChapterAccess = nextChapter ? chapterAccessMap[nextChapter.id] : undefined;
  const isNextLocked = nextChapter
    ? nextChapterAccess
      ? nextChapterAccess.isLocked
      : !nextChapter.is_free
    : false;

  // ~200-Word Deterministic Pagination Engine
  const paginated = useMemo(() => {
    if (!hasAccess || !currentChapter.content) {
      return { pages: [''], totalWords: 0, totalPages: 1 };
    }
    return paginateChapterContent(currentChapter.content, 200);
  }, [hasAccess, currentChapter.content]);

  // Current page state (1-indexed)
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof initialPage === 'number' && initialPage >= 1) {
      return initialPage;
    }
    if (savedProgress?.chapterId === currentChapter.id && savedProgress.pageIndex >= 1) {
      return savedProgress.pageIndex;
    }
    return 1;
  });

  // Sync current page if initialPage, savedProgress, or totalPages update
  useEffect(() => {
    if (typeof initialPage === 'number' && initialPage >= 1) {
      setCurrentPage(Math.min(initialPage, paginated.totalPages));
    } else if (savedProgress?.chapterId === currentChapter.id && savedProgress.pageIndex >= 1) {
      setCurrentPage(Math.min(savedProgress.pageIndex, paginated.totalPages));
    } else {
      setCurrentPage(1);
    }
  }, [currentChapter.id, initialPage, savedProgress, paginated.totalPages]);

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
    (
      newPrefs: Partial<{
        theme: ReaderTheme;
        fontFamily: FontFamily;
        fontSize: number;
        lineHeight: LineHeight;
        contentWidth: ContentWidth;
      }>,
    ) => {
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

  // Authoritative progress persistence to PostgreSQL server
  const saveProgressToServer = useCallback(
    (page: number) => {
      if (!isLoggedIn || !hasAccess) return;
      const percentage = Math.min(100, Math.max(0, Math.round((page / paginated.totalPages) * 100)));

      fetch('/api/library/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId: work.id,
          chapterId: currentChapter.id,
          pageIndex: page,
          totalPages: paginated.totalPages,
          percentage,
          isCompleted: page >= paginated.totalPages && currentIndex === allChapters.length - 1,
        }),
        keepalive: true,
      }).catch(() => {});
    },
    [
      isLoggedIn,
      hasAccess,
      paginated.totalPages,
      work.id,
      currentChapter.id,
      currentIndex,
      allChapters.length,
    ],
  );

  // Debounced progress saving when page changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgressToServer(currentPage);
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentPage, saveProgressToServer]);

  // Save on beforeunload
  useEffect(() => {
    function handleBeforeUnload() {
      saveProgressToServer(currentPage);
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveProgressToServer(currentPage);
    };
  }, [currentPage, saveProgressToServer]);

  const contentTopRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  // Scroll to content start on page turn (accounting for sticky header & reduced motion)
  const scrollToContentStart = useCallback(() => {
    if (typeof window === 'undefined') return;
    const el = contentTopRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stickyHeaderOffset = 72; // Header height + spacing offset

    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - stickyHeaderOffset;

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    // Move accessible focus without intrusive focus ring
    el.focus({ preventScroll: true });
  }, []);

  // Trigger smooth scroll when logical page changes (skip initial restore)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const raf = requestAnimationFrame(() => {
      scrollToContentStart();
    });
    return () => cancelAnimationFrame(raf);
  }, [currentPage, scrollToContentStart]);

  // Page turn handlers
  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    } else if (prevChapter) {
      router.push(`/asarlar/${work.slug}/${prevChapter.slug}`);
    }
  }, [currentPage, prevChapter, router, work.slug]);

  const goToNextPage = useCallback(() => {
    if (currentPage < paginated.totalPages) {
      setCurrentPage((p) => p + 1);
    } else if (nextChapter) {
      router.push(`/asarlar/${work.slug}/${nextChapter.slug}`);
    }
  }, [currentPage, paginated.totalPages, nextChapter, router, work.slug]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === 'Escape') {
        setShowSettings(false);
        setShowToc(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage]);

  // Reading progress percentage across current chapter
  const chapterProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((currentPage / paginated.totalPages) * 100)),
  );

  // Width container classes
  const widthClasses = {
    narrow: 'max-w-xl',
    medium: 'max-w-2xl',
    wide: 'max-w-4xl',
  }[contentWidth];

  const themeClass = `reader-theme-${theme}`;

  return (
    <div
      className={clsx(
        'min-h-screen transition-colors duration-200 antialiased selection:bg-amber-200 selection:text-amber-950 pb-32',
        themeClass,
      )}
    >
      {/* Top Page Progress Indicator Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-black/5">
        <div
          className="h-full bg-amber-600 transition-all duration-200"
          style={{ width: `${chapterProgressPercent}%` }}
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

            {/* Typography & Theme Preferences Button */}
            <button
              type="button"
              onClick={() => {
                setShowSettings(!showSettings);
                setShowToc(false);
              }}
              className="p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 opacity-85 hover:opacity-100 transition-opacity"
              title="Shrift va ko‘rinish"
              aria-label="Shrift va ko‘rinish"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Shrift</span>
            </button>
          </div>
        </div>

        {/* Preferences Drawer Panel */}
        {showSettings && (
          <div className="max-w-md mx-auto mt-2 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-150 text-stone-800 dark:text-stone-200">
            {/* Theme picker */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 font-serif">
                Mavzu
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    savePrefs({ theme: 'light' });
                  }}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                    theme === 'light'
                      ? 'bg-white border-amber-600 text-stone-900 shadow-xs ring-1 ring-amber-600'
                      : 'bg-stone-100 border-transparent text-stone-600 hover:bg-stone-200',
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
                    'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                    theme === 'sepia'
                      ? 'bg-[#F4ECD8] border-amber-800 text-[#3C3226] shadow-xs ring-1 ring-amber-800'
                      : 'bg-stone-100 border-transparent text-stone-600 hover:bg-stone-200',
                  )}
                >
                  <Coffee className="w-3.5 h-3.5 text-amber-800" />
                  <span>Sepiya</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    savePrefs({ theme: 'dark' });
                  }}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all',
                    theme === 'dark'
                      ? 'bg-stone-950 border-amber-500 text-stone-100 shadow-xs ring-1 ring-amber-500'
                      : 'bg-stone-100 border-transparent text-stone-600 hover:bg-stone-200',
                  )}
                >
                  <Moon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tungi</span>
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 font-serif">
                Shrift turi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFontFamily('serif');
                    savePrefs({ fontFamily: 'serif' });
                  }}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-xs font-serif font-bold transition-all',
                    fontFamily === 'serif'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400',
                  )}
                >
                  Klassik (Serif)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontFamily('sans');
                    savePrefs({ fontFamily: 'sans' });
                  }}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-xs font-sans font-bold transition-all',
                    fontFamily === 'sans'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400',
                  )}
                >
                  Zamonaviy (Sans)
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 font-serif">
                  Hajm
                </label>
                <span className="text-xs font-mono font-bold text-amber-600">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-stone-400">A-</span>
                <input
                  type="range"
                  min={14}
                  max={28}
                  step={1}
                  value={fontSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFontSize(val);
                    savePrefs({ fontSize: val });
                  }}
                  className="w-full accent-amber-600"
                />
                <span className="text-sm font-bold text-stone-700 dark:text-stone-300">A+</span>
              </div>
            </div>

            {/* Line Height */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 font-serif">
                Qatorlar oralig‘i
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'relaxed', 'loose'] as LineHeight[]).map((lh) => (
                  <button
                    key={lh}
                    type="button"
                    onClick={() => {
                      setLineHeight(lh);
                      savePrefs({ lineHeight: lh });
                    }}
                    className={clsx(
                      'py-1.5 px-2 rounded-xl border text-xs font-medium transition-all capitalize',
                      lineHeight === lh
                        ? 'bg-amber-100/80 border-amber-400 text-stone-900 font-bold'
                        : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-500',
                    )}
                  >
                    {lh === 'normal' ? 'Ixcham' : lh === 'relaxed' ? 'Qulay' : 'Keng'}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Width */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2 font-serif">
                Matn kengligi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['narrow', 'medium', 'wide'] as ContentWidth[]).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setContentWidth(w);
                      savePrefs({ contentWidth: w });
                    }}
                    className={clsx(
                      'py-1.5 px-2 rounded-xl border text-xs font-medium transition-all capitalize',
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
                  const access = chapterAccessMap[chap.id];
                  const isChapPurchased = access?.isPurchased;
                  const isChapLocked = access ? access.isLocked : !chap.is_free;

                  return (
                    <Link
                      key={chap.id}
                      href={`/asarlar/${work.slug}/${chap.slug}`}
                      prefetch={!isChapLocked}
                      onClick={() => setShowToc(false)}
                      className={clsx(
                        'flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors',
                        isCurrent
                          ? 'bg-amber-100/90 dark:bg-amber-950/60 font-bold text-amber-950 dark:text-amber-200 ring-1 ring-amber-500/40'
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            <Unlock className="w-3 h-3" />
                            <span>Bepul</span>
                          </span>
                        ) : isChapPurchased ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ochiq</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                            <Lock className="w-3 h-3" />
                            <span>{formatUZS(chap.price)}</span>
                          </span>
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
      <main className={clsx('mx-auto px-4 sm:px-8 py-8 sm:py-14', widthClasses)}>
        <div ref={contentTopRef} tabIndex={-1} className="focus:outline-hidden" aria-hidden="true" />
        {/* Author Preview Banner */}
        {accessReason === 'author' && (
          <div className="mb-8 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 text-xs font-semibold flex items-center gap-3 shadow-xs">
            <PenTool className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Muallif ko‘rigi rejimi:</span> Siz ushbu asarning
              muallifisiz. Bob matni mualliflik huquqingiz asosida ko‘rsatilmoqda.
            </div>
          </div>
        )}

        {/* Chapter Header */}
        <header className="mb-8 sm:mb-12 text-center border-b border-stone-200/60 dark:border-stone-800 pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 block font-serif">
            {currentChapter.chapter_number}-bob
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight leading-snug">
            {currentChapter.title}
          </h1>

          {/* Sub-header with pagination info if multi-page */}
          {hasAccess && paginated.totalPages > 1 && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 dark:bg-stone-800/80 text-[11px] font-mono text-stone-500 dark:text-stone-400">
              <span>
                Sahifa: {currentPage} / {paginated.totalPages}
              </span>
              <span>•</span>
              <span>{paginated.totalWords} ta so‘z</span>
            </div>
          )}
        </header>

        {/* Chapter Body (Paginated ~200 words) or Paywall Unlock Card */}
        {hasAccess ? (
          <div className="space-y-8">
            <article
              style={{
                fontSize: `${fontSize}px`,
                lineHeight:
                  lineHeight === 'normal' ? 1.55 : lineHeight === 'relaxed' ? 1.85 : 2.15,
                fontFamily:
                  fontFamily === 'serif'
                    ? 'var(--font-serif-family)'
                    : 'var(--font-sans-family)',
              }}
              className="reader-article selection:bg-amber-200 selection:text-amber-950 font-normal leading-relaxed space-y-6 min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: paginated.pages[currentPage - 1] || '' }}
            />

            {/* Within-Chapter Pagination Controls (~200 words per page) */}
            {paginated.totalPages > 1 && (
              <div className="pt-6 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1 && !prevChapter}
                  className="px-4 py-2.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 font-bold text-xs sm:text-sm shadow-xs hover:border-amber-600 disabled:opacity-35 disabled:hover:border-stone-200 transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{currentPage > 1 ? 'Oldingi sahifa' : 'Oldingi bob'}</span>
                </button>

                <div className="flex items-center gap-1 font-mono text-xs font-bold text-stone-600 dark:text-stone-400">
                  <span className="text-amber-700 dark:text-amber-400">{currentPage}</span>
                  <span>/</span>
                  <span>{paginated.totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={goToNextPage}
                  className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>
                    {currentPage < paginated.totalPages ? 'Keyingi sahifa' : 'Keyingi bob'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
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
          className="mt-14 pt-8 border-t border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-3"
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
            isNextLocked ? (
              <Link
                href={`/asarlar/${work.slug}/${nextChapter.slug}`}
                prefetch={false}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-bold text-xs sm:text-sm shadow-xs hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-all active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden sm:inline">
                  Keyingi bob — {formatUZS(nextChapter.price)}
                </span>
                <span className="sm:hidden">Keyingi ({formatUZS(nextChapter.price)})</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href={`/asarlar/${work.slug}/${nextChapter.slug}`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
              >
                <span className="hidden sm:inline">Keyingi bob</span>
                <span className="sm:hidden">Keyingi</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            )
          ) : (
            <div />
          )}
        </nav>
      </main>
    </div>
  );
}
