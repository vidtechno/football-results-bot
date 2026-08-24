'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';

interface SearchBoxProps {
  initialValue?: string;
  placeholder?: string;
  className?: string;
  size?: 'normal' | 'large';
}

export function SearchBox({
  initialValue = '',
  placeholder = 'Tashkilot yoki xizmat nomini qidiring (masalan, NBU, Beeline, Soliq)...',
  className,
  size = 'normal',
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  const isLarge = size === 'large';

  return (
    <form onSubmit={handleSubmit} className={clsx('relative w-full', className)}>
      <div
        className={clsx(
          'relative flex items-center rounded-2xl bg-white border border-slate-200 shadow-sm focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10 transition-all',
          isLarge ? 'p-2 sm:p-2.5' : 'p-1.5',
        )}
      >
        <Search className={clsx('ml-3 text-slate-400 flex-shrink-0', isLarge ? 'w-6 h-6' : 'w-5 h-5')} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className={clsx(
            'w-full bg-transparent px-3 text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none',
            isLarge ? 'text-base sm:text-lg' : 'text-sm',
          )}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full mr-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className={clsx(
            'flex-shrink-0 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors shadow-sm',
            isLarge ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm',
          )}
        >
          Qidirish
        </button>
      </div>
    </form>
  );
}
