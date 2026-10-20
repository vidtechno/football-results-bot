'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

function pageList(current: number, last: number): Array<number | '…'> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: Array<number | '…'> = [1];
  if (current > 3) pages.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) pages.push(i);
  if (current < last - 2) pages.push('…');
  pages.push(last);
  return pages;
}

/** Admin ro'yxatlari uchun yagona sahifalash paneli (holat orqali ishlaydi, URL o'zgarmaydi). */
export function AdminPagination({ page, totalPages, total, pageSize, onPageChange, disabled }: AdminPaginationProps) {
  if (total <= 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'min-h-[40px] min-w-[40px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center transition-colors disabled:opacity-40';

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
      <span className="text-xs font-bold text-slate-500">
        {from}–{to} / {total} ta
      </span>
      {totalPages > 1 && (
        <nav className="flex items-center gap-1.5" aria-label="Sahifalash">
          <button
            type="button"
            disabled={disabled || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={`${btn} bg-white border-slate-200 text-slate-600`}
            aria-label="Oldingi sahifa"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-slate-400 text-xs">…</span>
            ) : (
              <button
                key={p}
                type="button"
                disabled={disabled}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} ${
                  p === page
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={disabled || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={`${btn} bg-white border-slate-200 text-slate-600`}
            aria-label="Keyingi sahifa"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
}
