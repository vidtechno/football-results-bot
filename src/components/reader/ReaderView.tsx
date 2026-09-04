'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Type,
  ArrowLeft,
  BookOpen,
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

export function ReaderView({
  work,
  currentChapter,
  allChapters,
  hasAccess,
  userBalance = 0,
  isLoggedIn,
}: ReaderViewProps) {
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif'>('serif');
  const [lineHeight, setLineHeight] = useState<'normal' | 'relaxed' | 'loose'>('relaxed');
  const [showSettings, setShowSettings] = useState(false);

  // Determine prev and next chapters
  const currentIndex = allChapters.findIndex((c) => c.id === currentChapter.id);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter =
    currentIndex >= 0 && currentIndex < allChapters.length - 1
      ? allChapters[currentIndex + 1]
      : null;

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && prevChapter) {
        window.location.href = `/asarlar/${work.slug}/${prevChapter.slug}`;
      } else if (e.key === 'ArrowRight' && nextChapter) {
        window.location.href = `/asarlar/${work.slug}/${nextChapter.slug}`;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevChapter, nextChapter, work.slug]);

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 pb-28">
      {/* Sticky Reader Header Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link
            href={`/asarlar/${work.slug}`}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors truncate"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="truncate max-w-[200px] sm:max-w-xs">{work.title}</span>
          </Link>

          {/* Controls: Font & Layout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={clsx(
                'p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all',
                showSettings
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700',
              )}
              title="Shrift va o‘qish sozlamalari"
              aria-label="Sozlamalar"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Sozlamalar</span>
            </button>
          </div>
        </div>

        {/* Dropdown Reader Settings Drawer */}
        {showSettings && (
          <div className="max-w-4xl mx-auto mt-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
              {/* Font Size */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 uppercase text-[10px] tracking-wide">
                  Hajm:
                </span>
                <button
                  onClick={() => setFontSize((s) => Math.max(14, s - 2))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  A-
                </button>
                <span className="w-8 text-center text-slate-800">{fontSize}px</span>
                <button
                  onClick={() => setFontSize((s) => Math.min(28, s + 2))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  A+
                </button>
              </div>

              {/* Font Family */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 uppercase text-[10px] tracking-wide">
                  Shrift:
                </span>
                <button
                  onClick={() => setFontFamily('serif')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium',
                    fontFamily === 'serif'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                      : 'border-slate-200 text-slate-600',
                  )}
                >
                  Serif
                </button>
                <button
                  onClick={() => setFontFamily('sans')}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg border text-xs font-medium',
                    fontFamily === 'sans'
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                      : 'border-slate-200 text-slate-600',
                  )}
                >
                  Sans
                </button>
              </div>

              {/* Line Height */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 uppercase text-[10px] tracking-wide">
                  Interval:
                </span>
                {(['normal', 'relaxed', 'loose'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setLineHeight(h)}
                    className={clsx(
                      'px-2.5 py-1.5 rounded-lg border capitalize text-xs',
                      lineHeight === h
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600',
                    )}
                  >
                    {h === 'normal' ? 'Qisqa' : h === 'relaxed' ? 'O‘rta' : 'Keng'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Reading Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Chapter Title & Number */}
        <header className="mb-8 sm:mb-12 text-center border-b border-slate-200/80 pb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1 block">
            {currentChapter.chapter_number}-bob
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-snug">
            {currentChapter.title}
          </h1>
        </header>

        {/* Chapter Content or Paywall Unlock Card */}
        {hasAccess ? (
          <article
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: lineHeight === 'normal' ? 1.5 : lineHeight === 'relaxed' ? 1.8 : 2.1,
              fontFamily:
                fontFamily === 'serif'
                  ? 'Charter, Georgia, Cambria, "Times New Roman", Times, serif'
                  : 'var(--font-inter), system-ui, sans-serif',
            }}
            className="text-slate-800 selection:bg-blue-100 whitespace-pre-wrap leading-relaxed space-y-6"
          >
            {currentChapter.content}
          </article>
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

        {/* Bottom Chapter Navigation Bar */}
        <nav
          className="mt-14 pt-8 border-t border-slate-200/80 flex items-center justify-between gap-4"
          aria-label="Boblar bo‘ylab harakatlanish"
        >
          {prevChapter ? (
            <Link
              href={`/asarlar/${work.slug}/${prevChapter.slug}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 font-bold text-xs sm:text-sm shadow-xs transition-all"
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
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Mundarija</span>
          </Link>

          {nextChapter ? (
            <Link
              href={`/asarlar/${work.slug}/${nextChapter.slug}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all"
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
