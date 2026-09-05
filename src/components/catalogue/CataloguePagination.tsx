'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface CataloguePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  scrollTargetId?: string;
}

export function CataloguePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  scrollTargetId = 'catalogue-results-top',
}: CataloguePaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  // Build page link preserving existing search/filter query parameters
  const getPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  };

  const handlePageClick = () => {
    if (typeof window === 'undefined') return;
    const target = document.getElementById(scrollTargetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Generate page numbers with ellipses
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      className="mt-10 pt-6 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs select-none"
      aria-label="Katalog sahifalari"
    >
      {/* Items count summary */}
      <div className="text-stone-500 font-medium">
        Jami <strong className="text-stone-800 font-bold">{totalItems}</strong> ta asardan{' '}
        <span className="font-semibold text-stone-700">
          {startItem}–{endItem}
        </span>{' '}
        ko‘rsatilmoqda
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Previous Page Button */}
        {currentPage > 1 ? (
          <Link
            href={getPageUrl(currentPage - 1)}
            onClick={handlePageClick}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 font-bold hover:bg-stone-50 transition-colors min-h-[40px]"
            aria-label="Oldingi sahifa"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Oldingi</span>
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200/60 bg-stone-50 text-stone-300 font-bold cursor-not-allowed min-h-[40px]">
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Oldingi</span>
          </span>
        )}

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-stone-400 font-bold">
                  …
                </span>
              );
            }

            const pageNum = Number(p);
            const isCurrent = pageNum === currentPage;

            return (
              <Link
                key={`page-${pageNum}`}
                href={getPageUrl(pageNum)}
                onClick={handlePageClick}
                className={clsx(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold flex items-center justify-center transition-all min-h-[40px]',
                  isCurrent
                    ? 'bg-amber-600 text-white shadow-xs font-black'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50',
                )}
                aria-current={isCurrent ? 'page' : undefined}
                aria-label={`${pageNum}-sahifa`}
              >
                {pageNum}
              </Link>
            );
          })}
        </div>

        {/* Next Page Button */}
        {currentPage < totalPages ? (
          <Link
            href={getPageUrl(currentPage + 1)}
            onClick={handlePageClick}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 font-bold hover:bg-stone-50 transition-colors min-h-[40px]"
            aria-label="Keyingi sahifa"
          >
            <span className="hidden sm:inline">Keyingi</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        ) : (
          <span className="flex items-center gap-1 px-3 py-2 rounded-xl border border-stone-200/60 bg-stone-50 text-stone-300 font-bold cursor-not-allowed min-h-[40px]">
            <span className="hidden sm:inline">Keyingi</span>
            <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
