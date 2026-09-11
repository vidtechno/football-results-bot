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
  Bookmark,
  AlertCircle,
  Loader2,
  Highlighter,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Work, Chapter } from '@/lib/types/platform';
import type { ChapterAccessReason, ChapterAccessStatus } from '@/lib/security/access';
import { formatUZS } from '@/lib/utils/currency';
import { paginateChapterContent } from '@/lib/reader/pagination';
import { PaywallUnlockCard } from './PaywallUnlockCard';
import { ChapterReactionsBar } from './ChapterReactionsBar';
import { ChapterCommentsSection } from './ChapterCommentsSection';
import { trackAnalytics } from '@/lib/analytics/client';
import { CompletionCard } from './CompletionCard';
import { getPublicWorkAuthorName } from '@/lib/utils/workAttribution';
import { PlusBadge } from '@/components/plus/PlusBadge';

interface ReaderViewProps {
  work: Work;
  currentChapter: Chapter;
  allChapters: Chapter[];
  hasAccess: boolean;
  accessReason?: ChapterAccessReason;
  userBalance?: number;
  isLoggedIn: boolean;
  chapterAccessMap?: Record<string, ChapterAccessStatus>;
  savedProgress?: {
    pageIndex: number;
    percentage: number;
    chapterId: string;
    lastReadAt?: string | null;
    last_read_at?: string | null;
    timestamp?: number;
  } | null;
  initialPage?: number;
}

/**
 * Resolves the freshest valid reading page according to platform precedence:
 * 1. Explicit URL ?page= always has highest priority
 * 2. Compare local timestamp and server progress timestamp if available
 * 3. If local progress is newer for the same chapter, use local progress
 * 4. Otherwise use server progress
 * 5. Never reset a valid local restored page to 1 immediately after mount
 * 6. Clamp restored page to paginated totalPages
 */
export function resolveReadingPage({
  initialPage,
  localProgress,
  savedProgress,
  chapterId,
  totalPages,
}: {
  initialPage?: number;
  localProgress?: { chapterId?: string; pageIndex?: number; timestamp?: number } | null;
  savedProgress?: {
    chapterId?: string;
    pageIndex?: number;
    timestamp?: number;
    lastReadAt?: string | null;
    last_read_at?: string | null;
  } | null;
  chapterId: string;
  totalPages: number;
}): number {
  const maxPage = Math.max(1, totalPages || 1);

  // 1. Explicit URL initialPage always has highest priority
  if (typeof initialPage === 'number' && !isNaN(initialPage) && initialPage >= 1) {
    return Math.min(Math.floor(initialPage), maxPage);
  }

  const localMatches =
    Boolean(localProgress) &&
    localProgress!.chapterId === chapterId &&
    typeof localProgress!.pageIndex === 'number' &&
    !isNaN(localProgress!.pageIndex!) &&
    localProgress!.pageIndex! >= 1;

  const serverMatches =
    Boolean(savedProgress) &&
    savedProgress!.chapterId === chapterId &&
    typeof savedProgress!.pageIndex === 'number' &&
    !isNaN(savedProgress!.pageIndex!) &&
    savedProgress!.pageIndex! >= 1;

  if (localMatches && serverMatches) {
    const localTime = Number(localProgress!.timestamp || 0);
    const serverTime = savedProgress!.timestamp
      ? Number(savedProgress!.timestamp)
      : (savedProgress!.lastReadAt || savedProgress!.last_read_at)
      ? new Date(savedProgress!.lastReadAt || savedProgress!.last_read_at!).getTime()
      : 0;

    if (localTime >= serverTime) {
      return Math.min(Math.floor(localProgress!.pageIndex!), maxPage);
    } else {
      return Math.min(Math.floor(savedProgress!.pageIndex!), maxPage);
    }
  }

  if (localMatches) {
    return Math.min(Math.floor(localProgress!.pageIndex!), maxPage);
  }

  if (serverMatches) {
    return Math.min(Math.floor(savedProgress!.pageIndex!), maxPage);
  }

  return 1;
}

function getStoredLocalProgress(workId: string): {
  chapterId?: string;
  pageIndex?: number;
  timestamp?: number;
  totalPages?: number;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`manbora:progress:${workId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

type ReaderTheme = 'light' | 'sepia' | 'dark';
type FontFamily = 'inter' | 'system';
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

  // Reader Preferences (Persisted locally, default modern Sans-serif)
  const [theme, setTheme] = useState<ReaderTheme>('light');
  const [fontFamily, setFontFamily] = useState<FontFamily>('inter');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<LineHeight>('relaxed');
  const [contentWidth, setContentWidth] = useState<ContentWidth>('medium');
  const [autoAdvance, setAutoAdvance] = useState(false);

  // UI Drawer & Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showSignupGate, setShowSignupGate] = useState(false);

  // Close TOC and Settings on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowToc(false);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const isPaidFullWork =
    (work.access_type as string) === 'paid_full_work' ||
    (work.access_type as string) === 'paid_book' ||
    ((work.access_type as string) !== 'paid_by_chapter' &&
      work.access_type !== 'free' &&
      Number(work.full_work_price || 0) > 0);

  // ~200-Word Deterministic Pagination Engine
  const paginated = useMemo(() => {
    if (!hasAccess || !currentChapter.content) {
      return { pages: [''], totalWords: 0, totalPages: 1 };
    }
    return paginateChapterContent(currentChapter.content, 200);
  }, [hasAccess, currentChapter.content]);

  // Current page state (1-indexed) initialized using freshest progress
  const [currentPage, setCurrentPage] = useState<number>(() => {
    const local = getStoredLocalProgress(work.id);
    return resolveReadingPage({
      initialPage,
      localProgress: local,
      savedProgress,
      chapterId: currentChapter.id,
      totalPages: paginated.totalPages,
    });
  });

  const prevChapterIdRef = useRef(currentChapter.id);
  const prevInitialPageRef = useRef(initialPage);

  // Client-side hydration sync: restore freshest local storage progress on mount without wiping
  useEffect(() => {
    const local = getStoredLocalProgress(work.id);
    if (local && local.chapterId === currentChapter.id) {
      const resolved = resolveReadingPage({
        initialPage,
        localProgress: local,
        savedProgress,
        chapterId: currentChapter.id,
        totalPages: paginated.totalPages,
      });
      setCurrentPage((prev) => (prev !== resolved ? resolved : prev));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync current page when chapter, explicit URL initialPage, or totalPages changes
  useEffect(() => {
    const chapterChanged = currentChapter.id !== prevChapterIdRef.current;
    const initialPageChanged = initialPage !== prevInitialPageRef.current;
    prevChapterIdRef.current = currentChapter.id;
    prevInitialPageRef.current = initialPage;

    if (initialPageChanged && typeof initialPage === 'number' && initialPage >= 1) {
      setCurrentPage(Math.min(initialPage, paginated.totalPages));
      return;
    }

    if (chapterChanged) {
      const local = getStoredLocalProgress(work.id);
      const resolved = resolveReadingPage({
        initialPage,
        localProgress: local,
        savedProgress,
        chapterId: currentChapter.id,
        totalPages: paginated.totalPages,
      });
      setCurrentPage(resolved);
      return;
    }

    // Clamp restored page to paginated.totalPages without resetting valid page to 1
    setCurrentPage((prev) => Math.min(prev, Math.max(1, paginated.totalPages)));
  }, [currentChapter.id, initialPage, paginated.totalPages, work.id, savedProgress]);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('manbora_reader_prefs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.fontFamily === 'system') setFontFamily('system');
        else setFontFamily('inter');
        if (parsed.fontSize) setFontSize(Number(parsed.fontSize));
        if (parsed.lineHeight) setLineHeight(parsed.lineHeight);
        if (parsed.contentWidth) setContentWidth(parsed.contentWidth);
        if (typeof parsed.autoAdvance === 'boolean') setAutoAdvance(parsed.autoAdvance);
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
        autoAdvance: boolean;
      }>,
    ) => {
      try {
        const current = {
          theme,
          fontFamily,
          fontSize,
          lineHeight,
          contentWidth,
          autoAdvance,
          ...newPrefs,
        };
        localStorage.setItem('manbora_reader_prefs', JSON.stringify(current));
      } catch {
        // ignore
      }
    },
    [theme, fontFamily, fontSize, lineHeight, contentWidth, autoAdvance],
  );

  type Annotation = { id: string; page_number: number; quote: string; note?: string | null; color: 'yellow' | 'green' | 'blue' | 'pink' };
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState('');
  const [annotationNote, setAnnotationNote] = useState('');
  const [annotationColor, setAnnotationColor] = useState<Annotation['color']>('yellow');
  const [annotationSaving, setAnnotationSaving] = useState(false);
  const articleRef = useRef<HTMLElement | null>(null);

  const loadAnnotations = useCallback(() => {
    if (!isLoggedIn) return;
    fetch(`/api/reader/annotations?chapterId=${currentChapter.id}`).then(r => r.json()).then(j => {
      if (Array.isArray(j.annotations)) setAnnotations(j.annotations);
    }).catch(() => {});
  }, [currentChapter.id, isLoggedIn]);

  useEffect(() => { loadAnnotations(); }, [loadAnnotations]);

  const captureSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !articleRef.current) return;
    const range = selection.getRangeAt(0);
    if (!articleRef.current.contains(range.commonAncestorContainer)) return;
    const quote = selection.toString().replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (quote.length >= 2) { setSelectedQuote(quote); setShowAnnotations(true); }
  }, []);

  const saveAnnotation = async () => {
    if (!isLoggedIn) { router.push(`/kirish?returnUrl=${encodeURIComponent(location.pathname + location.search)}`); return; }
    if (!selectedQuote || annotationSaving) return;
    setAnnotationSaving(true);
    try {
      const res = await fetch('/api/reader/annotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        workId: work.id, chapterId: currentChapter.id, pageNumber: currentPage,
        quote: selectedQuote, note: annotationNote, color: annotationColor,
      }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Qayd saqlanmadi');
      setAnnotations(prev => [json.annotation, ...prev]); setSelectedQuote(''); setAnnotationNote('');
      window.getSelection()?.removeAllRanges(); showReaderToast('Highlight va qayd saqlandi');
    } catch (error) { showReaderToast(error instanceof Error ? error.message : 'Qayd saqlanmadi', 'error'); }
    finally { setAnnotationSaving(false); }
  };

  const deleteAnnotation = async (id: string) => {
    const res = await fetch(`/api/reader/annotations?id=${id}`, { method: 'DELETE' });
    if (res.ok) setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  // Bookmark state (strictly 1 bookmark per work per reader)
  const [bookmark, setBookmark] = useState<{ id: string; chapterId: string; pageNumber: number } | null>(null);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [readerToast, setReaderToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showReaderToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setReaderToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setReaderToast(null);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let isMounted = true;
    const fetchBookmark = () => {
      fetch(`/api/bookmarks?workId=${work.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && data.bookmark) {
            setBookmark({
              id: data.bookmark.id,
              chapterId: data.bookmark.chapter_id,
              pageNumber: data.bookmark.page_number,
            });
          }
        })
        .catch(() => {});
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const handle = (window as any).requestIdleCallback(fetchBookmark, { timeout: 2000 });
      return () => {
        isMounted = false;
        (window as any).cancelIdleCallback(handle);
      };
    } else {
      const timer = setTimeout(fetchBookmark, 500);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, [isLoggedIn, work.id]);

  const isCurrentPageBookmarked =
    bookmark !== null &&
    bookmark.chapterId === currentChapter.id &&
    bookmark.pageNumber === currentPage;

  const handleToggleBookmark = async () => {
    if (!isLoggedIn) {
      const currentUrl =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : `/asarlar/${work.slug}`;
      router.push(`/kirish?returnUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }
    if (bookmarkLoading) return;

    setBookmarkLoading(true);
    try {
      if (isCurrentPageBookmarked) {
        // Remove bookmark
        const res = await fetch(`/api/bookmarks?workId=${work.id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          setBookmark(null);
          showReaderToast('Xatcho‘p o‘chirildi', 'success');
        } else {
          showReaderToast(json.error || 'Xatcho‘pni saqlab bo‘lmadi. Qayta urinib ko‘ring.', 'error');
        }
      } else {
        const isMoved = bookmark !== null;
        // Save / update bookmark to current page
        const totalWorkChapters = Math.max(1, allChapters.length);
        const chapterFraction = paginated.totalPages > 0 ? currentPage / paginated.totalPages : 0;
        const percentage = Math.min(
          100,
          Math.max(0, Math.round(((currentIndex + chapterFraction) / totalWorkChapters) * 100)),
        );

        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workId: work.id,
            chapterId: currentChapter.id,
            pageNumber: currentPage,
            progressPercent: percentage,
          }),
        });
        const json = await res.json();
        if (json.success && json.bookmark) {
          setBookmark({
            id: json.bookmark.id,
            chapterId: json.bookmark.chapter_id,
            pageNumber: json.bookmark.page_number,
          });
          showReaderToast(
            isMoved ? 'Xatcho‘p yangi joyga ko‘chirildi' : 'Xatcho‘p saqlandi',
            'success',
          );
        } else {
          showReaderToast(json.error || 'Xatcho‘pni saqlab bo‘lmadi. Qayta urinib ko‘ring.', 'error');
        }
      }
    } catch (err) {
      console.error('Bookmark toggle error:', err);
      showReaderToast('Xatcho‘pni saqlab bo‘lmadi. Qayta urinib ko‘ring.', 'error');
    } finally {
      setBookmarkLoading(false);
    }
  };

  // Refs to always keep freshest values for callbacks and event handlers without stale closures
  const currentPageRef = useRef<number>(currentPage);
  currentPageRef.current = currentPage;

  const currentChapterRef = useRef<Chapter>(currentChapter);
  currentChapterRef.current = currentChapter;

  const paginatedRef = useRef(paginated);
  paginatedRef.current = paginated;

  const allChaptersRef = useRef<Chapter[]>(allChapters);
  allChaptersRef.current = allChapters;

  const isLoggedInRef = useRef(isLoggedIn);
  isLoggedInRef.current = isLoggedIn;

  const hasAccessRef = useRef(hasAccess);
  hasAccessRef.current = hasAccess;

  const workRef = useRef(work);
  workRef.current = work;

  // Throttled & local-first progress persistence
  const lastSavedTimeRef = useRef<number>(0);
  const lastSavedPageRef = useRef<number>(currentPage);
  const lastSavedChapterRef = useRef<string>(currentChapter.id);
  const serverSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastForcedSaveRef = useRef<{ key: string; at: number } | null>(null);

  // Authoritative progress persistence to PostgreSQL server
  const saveProgressToServer = useCallback(
    (
      page: number,
      options?: {
        force?: boolean;
        chapter?: Chapter;
        totalPages?: number;
      },
    ) => {
      if (!isLoggedInRef.current || !hasAccessRef.current) return;
      const targetChapter = options?.chapter || currentChapterRef.current;
      const totalPages = options?.totalPages ?? paginatedRef.current.totalPages;
      const force = options?.force || false;
      const now = Date.now();
      const forcedSaveKey = `${targetChapter.id}:${page}:${totalPages}`;

      // visibilitychange, pagehide and unmount can fire together. One identical
      // final write is enough and preserves the same authoritative progress.
      if (force && lastForcedSaveRef.current?.key === forcedSaveKey && now - lastForcedSaveRef.current.at < 2000) {
        return;
      }
      if (force) lastForcedSaveRef.current = { key: forcedSaveKey, at: now };

      const timeSinceLast = now - lastSavedTimeRef.current;
      const pagesSinceLast = Math.abs(page - lastSavedPageRef.current);
      const chapterChanged = targetChapter.id !== lastSavedChapterRef.current;
      const pageAdvanced = pagesSinceLast > 0 || chapterChanged;

      // If not forced: throttle server writes to at most once per 45s or if >= 5 pages turned
      if (!force && !chapterChanged && timeSinceLast < 45000 && pagesSinceLast < 5) {
        if (!serverSaveTimerRef.current) {
          const delay = Math.max(1000, 45000 - timeSinceLast);
          serverSaveTimerRef.current = setTimeout(() => {
            serverSaveTimerRef.current = null;
            saveProgressToServer(currentPageRef.current, { force: true });
          }, delay);
        }
        return;
      }

      if (serverSaveTimerRef.current) {
        clearTimeout(serverSaveTimerRef.current);
        serverSaveTimerRef.current = null;
      }

      lastSavedTimeRef.current = now;
      lastSavedPageRef.current = page;
      lastSavedChapterRef.current = targetChapter.id;

      const chaptersList = allChaptersRef.current;
      const targetIndex = chaptersList.findIndex((c) => c.id === targetChapter.id);
      const totalWorkChapters = Math.max(1, chaptersList.length);
      const safeTotalPages = Math.max(1, totalPages);
      const chapterFraction = safeTotalPages > 0 ? page / safeTotalPages : 0;
      const safeIndex = targetIndex >= 0 ? targetIndex : 0;
      const percentage = Math.min(
        100,
        Math.max(0, Math.round(((safeIndex + chapterFraction) / totalWorkChapters) * 100)),
      );

      const payload = JSON.stringify({
        workId: workRef.current.id,
        chapterId: targetChapter.id,
        pageIndex: page,
        totalPages: safeTotalPages,
        percentage,
        chapterPercentage: Math.round(chapterFraction * 100),
        isCompleted: page >= safeTotalPages && safeIndex === chaptersList.length - 1,
        bookCompleted: page >= safeTotalPages && safeIndex === chaptersList.length - 1,
        pageAdvanced,
        activeSeconds: Math.min(90, Math.max(0, Math.round(timeSinceLast / 1000))),
        timestamp: now,
      });

      if (
        typeof navigator !== 'undefined' &&
        navigator.sendBeacon &&
        (force || document.visibilityState === 'hidden')
      ) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/library/progress', blob);
      } else {
        fetch('/api/library/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    },
    [],
  );

  // 1. Immediate localStorage persistence on every page turn + schedule throttled server write
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `manbora:progress:${work.id}`,
          JSON.stringify({
            workId: work.id,
            chapterId: currentChapter.id,
            pageIndex: currentPage,
            totalPages: paginated.totalPages,
            timestamp: Date.now(),
          }),
        );
      } catch {}
    }
    // Normal page turns do NOT force server writes (force: false)
    saveProgressToServer(currentPage, { force: false });
  }, [work.id, currentChapter.id, currentPage, paginated.totalPages, saveProgressToServer]);

  // 2. Immediate server flush when chapter changes while mounted
  const prevChapterFlushRef = useRef(currentChapter);
  const prevPageFlushRef = useRef(currentPage);
  const prevTotalPagesFlushRef = useRef(paginated.totalPages);

  useEffect(() => {
    if (prevChapterFlushRef.current.id !== currentChapter.id) {
      // Genuinely changing chapter while mounted: force flush progress for previous chapter using its own totalPages
      saveProgressToServer(prevPageFlushRef.current, {
        force: true,
        chapter: prevChapterFlushRef.current,
        totalPages: prevTotalPagesFlushRef.current,
      });
      prevChapterFlushRef.current = currentChapter;
    }
    prevPageFlushRef.current = currentPage;
    prevTotalPagesFlushRef.current = paginated.totalPages;
  }, [currentChapter, currentPage, paginated.totalPages, saveProgressToServer]);

  // 3. Lifecycle listeners: tab hidden, pagehide, beforeunload, and genuine unmount
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgressToServer(currentPageRef.current, { force: true });
      }
    };

    const handleBeforeUnload = () => {
      saveProgressToServer(currentPageRef.current, { force: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      // Genuinely unmounting the reader component: force final flush
      saveProgressToServer(currentPageRef.current, { force: true });
    };
  }, [saveProgressToServer]);

  const contentTopRef = useRef<HTMLDivElement | null>(null);
  const isInitialMount = useRef(true);

  // Synchronize currentPage with URL query parameter ?page=X without full reload
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const currentPageInUrl = parseInt(url.searchParams.get('page') || '1', 10);
    if (currentPageInUrl !== currentPage) {
      if (currentPage === 1) {
        url.searchParams.delete('page');
      } else {
        url.searchParams.set('page', String(currentPage));
      }
      window.history.pushState({ page: currentPage }, '', url.toString());
    }
  }, [currentPage]);

  // Listen to popstate for browser Back/Forward navigation
  useEffect(() => {
    function handlePopState() {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const p = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
      setCurrentPage(Math.min(p, paginated.totalPages));
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [paginated.totalPages]);

  // Scroll to content start on page turn (accounting for sticky header - precise/instant scroll)
  const scrollToContentStart = useCallback(() => {
    if (typeof window === 'undefined') return;
    const el = contentTopRef.current;
    if (!el) return;

    const stickyHeaderOffset = 72; // Header height + spacing offset
    const elementPosition = el.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - stickyHeaderOffset;

    window.scrollTo({
      top: Math.max(0, offsetPosition),
      behavior: 'auto', // Precise/instant scroll, not smooth, ensuring no lag or offset issues
    });

    // Move accessible focus without intrusive focus ring
    el.focus({ preventScroll: true });
  }, []);

  // Trigger scroll when logical page changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scrollToContentStart();
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
      if (!isLoggedIn) {
        setShowSignupGate(true);
        trackAnalytics('signup_gate', { workId: work.id, chapterId: nextChapter.id });
        return;
      }
      router.push(`/asarlar/${work.slug}/${nextChapter.slug}`);
    }
  }, [currentPage, paginated.totalPages, nextChapter, router, work.id, work.slug, isLoggedIn]);

  // Bottom chapter navigation must never inherit the current page number.
  // It intentionally bypasses within-chapter pagination and opens page 1.
  const goToNextChapter = useCallback(() => {
    if (!nextChapter) return;
    if (!isLoggedIn) {
      setShowSignupGate(true);
      trackAnalytics('signup_gate', { workId: work.id, chapterId: nextChapter.id });
      return;
    }
    router.push(`/asarlar/${work.slug}/${nextChapter.slug}`);
  }, [isLoggedIn, nextChapter, router, work.id, work.slug]);

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

  useEffect(() => {
    if (nextChapter && !isNextLocked && chapterProgressPercent >= 70) {
      router.prefetch(`/asarlar/${work.slug}/${nextChapter.slug}`);
    }
  }, [chapterProgressPercent, isNextLocked, nextChapter, router, work.slug]);

  useEffect(() => {
    if (!autoAdvance || currentPage < paginated.totalPages || !nextChapter || isNextLocked) return;
    const timer = setTimeout(() => router.push(`/asarlar/${work.slug}/${nextChapter.slug}`), 5000);
    return () => clearTimeout(timer);
  }, [autoAdvance, currentPage, paginated.totalPages, nextChapter, isNextLocked, router, work.slug]);

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
      <header className="sticky top-0 z-40 reader-bar glass-header border-b px-4 py-2.5 transition-colors duration-200 xl:pr-[280px]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Back to Work Detail */}
          <Link
            href={`/asarlar/${work.slug}`}
            className="flex items-center gap-1.5 text-xs font-bold opacity-80 hover:opacity-100 transition-opacity truncate"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[180px] sm:max-w-xs">{work.title}</span>
            {work.is_plus && <PlusBadge className="hidden sm:inline-flex" />}
          </Link>

          {/* Reader Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" onClick={() => setShowAnnotations(v => !v)}
              className="p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 opacity-85 hover:text-amber-700"
              title="Highlight va qaydlar">
              <Highlighter className="w-4 h-4" />
              <span className="hidden sm:inline">Qaydlar</span>
            </button>
            {/* Bookmark Button */}
            <button
              type="button"
              onClick={handleToggleBookmark}
              disabled={bookmarkLoading}
              aria-pressed={isCurrentPageBookmarked}
              aria-label={
                isCurrentPageBookmarked
                  ? 'Xatcho‘pni o‘chirish'
                  : 'Ushbu sahifaga xatcho‘p qo‘yish'
              }
              className={clsx(
                'p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                isCurrentPageBookmarked
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 ring-1 ring-amber-500/50'
                  : 'opacity-85 hover:opacity-100 hover:text-amber-600',
                bookmarkLoading && 'opacity-50 cursor-not-allowed',
              )}
              title={
                isCurrentPageBookmarked
                  ? 'Xatcho‘p saqlangan (bosilsa o‘chiriladi)'
                  : 'Ushbu sahifaga xatcho‘p qo‘yish'
              }
            >
              <Bookmark
                className={clsx(
                  'w-4 h-4 transition-transform',
                  isCurrentPageBookmarked && 'fill-amber-600 text-amber-600 dark:fill-amber-400 dark:text-amber-400 scale-110',
                )}
              />
              <span className="hidden sm:inline">
                {isCurrentPageBookmarked ? 'Xatcho‘p saqlangan' : 'Xatcho‘p'}
              </span>
            </button>

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
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
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
            <label className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 dark:border-stone-700 p-3 text-xs font-bold">
              <span>Bob tugaganda avtomatik davom etish</span>
              <input type="checkbox" checked={autoAdvance} onChange={(e) => { setAutoAdvance(e.target.checked); savePrefs({ autoAdvance: e.target.checked }); }} className="accent-amber-600" />
            </label>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
                Shrift turi
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFontFamily('inter');
                    savePrefs({ fontFamily: 'inter' });
                  }}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-xs font-sans font-bold transition-all',
                    fontFamily === 'inter'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400',
                  )}
                >
                  Inter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontFamily('system');
                    savePrefs({ fontFamily: 'system' });
                  }}
                  className={clsx(
                    'py-2 px-3 rounded-xl border text-xs font-sans font-bold transition-all',
                    fontFamily === 'system'
                      ? 'bg-amber-100/80 border-amber-400 text-stone-900 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400',
                  )}
                >
                  Tizim shrifti
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
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

      {/* Persistent desktop reading tools */}
      <aside className="fixed right-5 top-20 bottom-5 z-30 hidden w-60 xl:flex flex-col rounded-3xl border border-stone-200/80 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 p-4 shadow-lg backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <ListFilter className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <div className="min-w-0">
            <h2 className="text-sm font-black">Mundarija</h2>
            <p className="text-[10px] opacity-55">{allChapters.length} ta bob</p>
          </div>
        </div>
        <nav className="mb-4 max-h-52 space-y-1 overflow-y-auto border-b border-stone-200 dark:border-stone-800 pb-3 pr-1" aria-label="Doimiy mundarija">
          {allChapters.map((chap) => {
            const isCurrent = chap.id === currentChapter.id;
            const access = chapterAccessMap[chap.id];
            const isLocked = access ? access.isLocked : !chap.is_free;
            return (
              <Link
                key={chap.id}
                href={`/asarlar/${work.slug}/${chap.slug}`}
                prefetch={!isLocked}
                className={clsx(
                  'flex items-start gap-2 rounded-xl px-2.5 py-2 text-[11px] leading-snug transition-colors',
                  isCurrent
                    ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-400/60 dark:bg-amber-950/60 dark:text-amber-200'
                    : 'hover:bg-stone-100 dark:hover:bg-stone-800',
                )}
              >
                <span className="w-5 shrink-0 font-mono opacity-50">{chap.chapter_number}.</span>
                <span className="line-clamp-2 flex-1 font-semibold">{chap.title}</span>
                {isLocked && <Lock className="h-3 w-3 shrink-0 text-amber-700" />}
              </Link>
            );
          })}
        </nav>

        <div className="mb-3 flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          <Type className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <h2 className="text-sm font-black">Mutolaa sozlamalari</h2>
        </div>

        <button
          type="button"
          onClick={handleToggleBookmark}
          disabled={bookmarkLoading}
          aria-pressed={isCurrentPageBookmarked}
          className={clsx(
            'mb-4 flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black shadow-sm transition-all disabled:opacity-60',
            isCurrentPageBookmarked
              ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-500 dark:bg-amber-950/70 dark:text-amber-200'
              : 'bg-amber-600 text-stone-950 hover:bg-amber-500',
          )}
        >
          {bookmarkLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className={clsx('h-4 w-4', isCurrentPageBookmarked && 'fill-current')} />
          )}
          <span>{isCurrentPageBookmarked ? 'Xatcho‘p saqlangan' : 'Xatcho‘pga saqlash'}</span>
        </button>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-50">Ko‘rinish</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['light', Sun, 'Yorug‘'],
                ['sepia', Coffee, 'Sepiya'],
                ['dark', Moon, 'Tungi'],
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTheme(value);
                    savePrefs({ theme: value });
                  }}
                  title={label}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[9px] font-bold',
                    theme === value
                      ? 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950/70 dark:text-amber-200'
                      : 'border-stone-200 dark:border-stone-700',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Shrift</p>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">{fontSize}px</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const value = Math.max(14, fontSize - 1);
                  setFontSize(value);
                  savePrefs({ fontSize: value });
                }}
                className="rounded-xl border border-stone-200 dark:border-stone-700 py-2 text-xs font-black"
              >
                A−
              </button>
              <button
                type="button"
                onClick={() => {
                  const value = Math.min(28, fontSize + 1);
                  setFontSize(value);
                  savePrefs({ fontSize: value });
                }}
                className="rounded-xl border border-stone-200 dark:border-stone-700 py-2 text-sm font-black"
              >
                A+
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="w-full rounded-xl bg-stone-100 dark:bg-stone-800 py-2 text-[11px] font-bold hover:bg-stone-200 dark:hover:bg-stone-700"
          >
            Barcha sozlamalar
          </button>
        </div>
      </aside>

      {/* Table of Contents Drawer Modal */}
      {showToc && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowToc(false);
          }}
          className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm h-full bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 p-5 overflow-y-auto flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 mb-4">
                <div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
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
                        {access?.accessReason === 'author' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                            <PenTool className="w-3 h-3" />
                            <span>Muallif</span>
                          </span>
                        ) : access?.accessReason === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Admin</span>
                          </span>
                        ) : isChapPurchased || access?.accessReason === 'purchased' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sotib olingan</span>
                          </span>
                        ) : access?.accessReason === 'plus' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Plus</span>
                          </span>
                        ) : (work.access_type === 'free' && !work.is_plus) || access?.isFree || (!work.is_plus && chap.is_free) ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            <Unlock className="w-3 h-3" />
                            <span>Bepul</span>
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

      {/* Main Reading Content Container with Desktop Right Tools Gutter */}
      <div className="w-full xl:pr-[280px] min-w-0">
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
        <header className="text-center max-w-2xl mx-auto space-y-3 pb-8 border-b border-stone-200/60 dark:border-stone-800">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 block">
            {currentChapter.chapter_number}-bob
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight leading-snug">
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
              ref={articleRef}
              onMouseUp={captureSelection}
              onTouchEnd={captureSelection}
              style={{
                fontSize: `${fontSize}px`,
                lineHeight:
                  lineHeight === 'normal' ? 1.55 : lineHeight === 'relaxed' ? 1.85 : 2.15,
                fontFamily:
                  fontFamily === 'inter'
                    ? 'var(--font-sans-family)'
                    : 'Arial, Helvetica, system-ui, sans-serif',
              }}
              className="reader-article selection:bg-amber-200 selection:text-amber-950 font-normal leading-relaxed space-y-6 min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: paginated.pages[currentPage - 1] || '' }}
            />

            {showAnnotations && (
              <aside className="rounded-2xl border border-amber-200 bg-white/90 p-4 text-stone-900 shadow-lg dark:border-amber-900 dark:bg-stone-900 dark:text-stone-100">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-black"><StickyNote className="h-4 w-4 text-amber-600" /> Highlight va shaxsiy qaydlar</h2>
                  <Link href="/qaydlar" className="text-xs font-bold text-amber-700">Barchasi</Link>
                </div>
                {selectedQuote && (
                  <div className="mb-4 space-y-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
                    <p className="line-clamp-3 border-l-4 border-amber-400 pl-3 text-sm italic">“{selectedQuote}”</p>
                    <div className="flex gap-2">
                      {(['yellow','green','blue','pink'] as const).map(color => <button key={color} type="button" aria-label={color} onClick={() => setAnnotationColor(color)} className={clsx('h-7 w-7 rounded-full border-2', color === 'yellow' && 'bg-yellow-300', color === 'green' && 'bg-emerald-300', color === 'blue' && 'bg-sky-300', color === 'pink' && 'bg-pink-300', annotationColor === color ? 'border-stone-900 dark:border-white' : 'border-transparent')} />)}
                    </div>
                    <textarea value={annotationNote} onChange={e => setAnnotationNote(e.target.value)} maxLength={4000} placeholder="Shaxsiy izoh (ixtiyoriy)" className="min-h-20 w-full rounded-xl border border-stone-200 bg-white p-3 text-sm dark:border-stone-700 dark:bg-stone-950" />
                    <button type="button" disabled={annotationSaving} onClick={saveAnnotation} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-stone-950 disabled:opacity-50">{annotationSaving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
                  </div>
                )}
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {annotations.filter(a => a.page_number === currentPage).map(a => (
                    <div key={a.id} className={clsx('rounded-xl border-l-4 bg-stone-50 p-3 dark:bg-stone-800', a.color === 'yellow' && 'border-yellow-400', a.color === 'green' && 'border-emerald-400', a.color === 'blue' && 'border-sky-400', a.color === 'pink' && 'border-pink-400')}>
                      <div className="flex justify-between gap-3"><p className="text-sm italic">“{a.quote}”</p><button type="button" onClick={() => deleteAnnotation(a.id)} aria-label="Qaydni o‘chirish"><Trash2 className="h-4 w-4 text-stone-400 hover:text-red-600" /></button></div>
                      {a.note && <p className="mt-2 text-xs text-stone-600 dark:text-stone-300">{a.note}</p>}
                    </div>
                  ))}
                  {!selectedQuote && annotations.filter(a => a.page_number === currentPage).length === 0 && <p className="py-4 text-center text-xs text-stone-500">Matndan parcha belgilang — highlight oynasi ochiladi.</p>}
                </div>
              </aside>
            )}
            {!nextChapter && currentPage >= paginated.totalPages && (
              <CompletionCard workTitle={work.title} authorName={getPublicWorkAuthorName(work)} coverUrl={work.cover_url} />
            )}

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
            chapterId={isPaidFullWork ? null : currentChapter.id}
            chapterTitle={currentChapter.title}
            price={isPaidFullWork ? Number(work.full_work_price || 0) : currentChapter.price}
            userBalance={userBalance}
            isLoggedIn={isLoggedIn}
            isFullWork={isPaidFullWork}
            workTitle={work.title}
            currentPath={`/asarlar/${work.slug}/${currentChapter.slug}`}
            isPlus={Boolean(work.is_plus)}
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

          <button
            type="button"
            onClick={() => setShowToc(true)}
            className="flex items-center gap-1.5 text-xs font-bold opacity-75 hover:opacity-100 hover:text-amber-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Mundarija</span>
          </button>

          {nextChapter ? (
            isNextLocked ? (
              <button type="button" onClick={goToNextChapter}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-bold text-xs sm:text-sm shadow-xs hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-all active:scale-95"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                <span className="hidden sm:inline">
                  Keyingi bob — kitobni sotib olish
                </span>
                <span className="sm:hidden">Kitob qulflangan</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={goToNextChapter}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
              >
                <span className="hidden sm:inline">Keyingi bob</span>
                <span className="sm:hidden">Keyingi</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )
          ) : (
            <div />
          )}
        </nav>

        {/* Chapter Reactions & Feedback */}
        {hasAccess && (
          <div className="mt-8 space-y-8">
            <ChapterReactionsBar
              chapterId={currentChapter.id}
              workId={work.id}
              canonicalUrl={`/asarlar/${work.slug}/${currentChapter.slug}`}
            />

            <ChapterCommentsSection
              chapterId={currentChapter.id}
              workId={work.id}
              chapterTitle={currentChapter.title}
              authorUserId={work.author_id}
              canonicalUrl={`/asarlar/${work.slug}/${currentChapter.slug}`}
            />
          </div>
        )}

        {showSignupGate && nextChapter && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="signup-gate-title">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 text-stone-900 shadow-2xl">
              <button type="button" onClick={() => setShowSignupGate(false)} className="float-right rounded-full p-2 hover:bg-stone-100" aria-label="Yopish"><X className="h-5 w-5" /></button>
              <BookOpen className="mb-4 h-10 w-10 text-emerald-700" />
              <h2 id="signup-gate-title" className="text-xl font-black">Mutolaani davom ettiring</h2>
              <p className="mt-2 text-sm text-stone-600">Birinchi bobdan keyingi boblarni o‘qish uchun bepul ro‘yxatdan o‘ting yoki akkauntingizga kiring. O‘qish joyingiz saqlanadi.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href={`/royxatdan-otish?returnUrl=${encodeURIComponent(`/asarlar/${work.slug}/${nextChapter.slug}`)}`} className="rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-800">Ro‘yxatdan o‘tish</Link>
                <Link href={`/kirish?returnUrl=${encodeURIComponent(`/asarlar/${work.slug}/${nextChapter.slug}`)}`} className="rounded-xl border border-stone-300 px-4 py-3 text-center text-sm font-bold hover:bg-stone-50">Kirish</Link>
              </div>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Visual Toast Feedback */}
      {readerToast && (
        <div
          role="status"
          aria-live="polite"
          className={clsx(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl shadow-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-300 pointer-events-none animate-in fade-in slide-in-from-bottom-3',
            readerToast.type === 'success'
              ? 'bg-[#1C1917] text-white border border-amber-500/30'
              : 'bg-red-900 text-white border border-red-700',
          )}
        >
          {readerToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{readerToast.message}</span>
        </div>
      )}
    </div>
  );
}
