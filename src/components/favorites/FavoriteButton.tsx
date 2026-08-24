'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { clsx } from 'clsx';

interface FavoriteButtonProps {
  type: 'team' | 'competition';
  id: string | number;
  name: string;
  logoUrl?: string;
  className?: string;
}

export function FavoriteButton({ type, id, name, logoUrl, className }: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);

  const storageKey = `fav_${type}s`;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setIsFav(parsed.some((item: any) => String(item.id) === String(id)));
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [id, storageKey]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const stored = localStorage.getItem(storageKey);
      let parsed = stored ? JSON.parse(stored) : [];

      if (isFav) {
        parsed = parsed.filter((item: any) => String(item.id) !== String(id));
        setIsFav(false);
      } else {
        parsed.push({ id, name, logoUrl, addedAt: new Date().toISOString() });
        setIsFav(true);
      }

      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch {
      // Ignore localStorage write errors
    }
  };

  return (
    <button
      onClick={toggleFavorite}
      className={clsx(
        'p-1.5 rounded-lg transition-all',
        isFav
          ? 'text-amber-400 bg-amber-400/10 hover:bg-amber-400/20'
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60',
        className,
      )}
      title={isFav ? 'Sevimlilardan o‘chirish' : 'Sevimlilarga qo‘shish'}
      aria-label={isFav ? 'Sevimlilardan o‘chirish' : 'Sevimlilarga qo‘shish'}
    >
      <Star className={clsx('w-4 h-4', isFav && 'fill-amber-400')} />
    </button>
  );
}
