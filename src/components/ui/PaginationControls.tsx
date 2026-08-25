'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function PaginationControls({ currentPage, totalPages, baseUrl }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    return page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
  };

  // Generate page numbers with ellipsis algorithm
  const getPageNumbers = () => {
    const pages: Array<number | '...'> = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Sahifalar navi"
      className="flex flex-wrap items-center justify-center gap-1.5 pt-4 border-t border-slate-200/80"
    >
      {/* Oldingi (Previous) */}
      {hasPrevious ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs shadow-2xs active:scale-95 transition-all min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Oldingi</span>
        </Link>
      ) : (
        <span
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs border border-slate-200/60 cursor-not-allowed opacity-60 min-h-[44px]"
          aria-disabled="true"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Oldingi</span>
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="w-8 h-11 flex items-center justify-center text-slate-400 font-extrabold text-xs select-none"
              >
                …
              </span>
            );
          }

          const isCurrent = p === currentPage;

          return isCurrent ? (
            <span
              key={p}
              aria-current="page"
              className="min-w-[44px] min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-600/25"
            >
              {p}
            </span>
          ) : (
            <Link
              key={p}
              href={createPageUrl(p)}
              className="min-w-[44px] min-h-[44px] px-3.5 py-2 rounded-xl bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 font-extrabold text-xs flex items-center justify-center border border-slate-200 shadow-2xs active:scale-95 transition-all"
            >
              {p}
            </Link>
          );
        })}
      </div>

      {/* Keyingi (Next) */}
      {hasNext ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs shadow-2xs active:scale-95 transition-all min-h-[44px]"
        >
          <span className="hidden xs:inline">Keyingi</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span
          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs border border-slate-200/60 cursor-not-allowed opacity-60 min-h-[44px]"
          aria-disabled="true"
        >
          <span className="hidden xs:inline">Keyingi</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      )}
    </nav>
  );
}
