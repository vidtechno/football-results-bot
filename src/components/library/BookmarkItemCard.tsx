'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Bookmark, Trash2, ArrowRight } from 'lucide-react';

interface BookmarkItemCardProps {
  bookmark: {
    id: string;
    page_number: number;
    progress_percent: number;
    updated_at: string;
    work: {
      id: string;
      title: string;
      slug: string;
      cover_url?: string;
      author?: {
        pen_name?: string;
      };
    };
    chapter?: {
      id: string;
      chapter_number: number;
      title: string;
      slug: string;
    };
  };
}

export function BookmarkItemCard({ bookmark }: BookmarkItemCardProps) {
  const [removed, setRemoved] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (removed) return null;

  const w = bookmark.work;
  const ch = bookmark.chapter;
  const readUrl = ch
    ? `/asarlar/${w.slug}/${ch.slug}?page=${bookmark.page_number}`
    : `/asarlar/${w.slug}`;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/bookmarks?id=${bookmark.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRemoved(true);
      }
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-3xl border border-[#EAE5DD] flex items-center gap-4 shadow-xs hover:border-amber-400 transition-colors">
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
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
            <Bookmark className="w-3 h-3 fill-amber-600 text-amber-600" />
            <span>{bookmark.page_number}-sahifa</span>
          </span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Xatcho‘pni o‘chirish"
            className="text-stone-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <h3 className="font-serif font-bold text-stone-900 text-sm truncate">{w.title}</h3>
        <p className="text-xs text-stone-500 truncate">{w.author?.pen_name || 'Muallif'}</p>

        {ch && (
          <p className="text-[11px] text-amber-800 font-semibold truncate">
            {ch.chapter_number}-bob: {ch.title}
          </p>
        )}

        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[10px] text-stone-400 font-bold">
            <span>Mutolaa</span>
            <span>{bookmark.progress_percent}%</span>
          </div>
          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all"
              style={{ width: `${Math.max(5, bookmark.progress_percent)}%` }}
            />
          </div>
        </div>

        <Link
          href={readUrl}
          className="inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors"
        >
          <span>Xatcho‘pdan o‘qish</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
