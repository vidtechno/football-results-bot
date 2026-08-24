'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Organization } from '@/lib/types/directory';
import { formatPhoneNumber } from '@/lib/utils/formatters';
import { Search, X, Loader2, CheckCircle2, Phone, MapPin, ArrowRight, Building2 } from 'lucide-react';
import { clsx } from 'clsx';

interface RealtimeSearchBoxProps {
  initialValue?: string;
  placeholder?: string;
  size?: 'normal' | 'large';
  className?: string;
  autoFocus?: boolean;
}

export function RealtimeSearchBox({
  initialValue = '',
  placeholder = 'Tashkilot nomi, sohasi, shahar yoki phone raqamini qidiring...',
  size = 'normal',
  className,
  autoFocus = false,
}: RealtimeSearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced live search logic
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    const timer = setTimeout(async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (res.ok) {
          const data = await res.json();
          setResults(data.organizations || []);
          setSelectedIndex(-1);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 280);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = useCallback((slug: string) => {
    setIsOpen(false);
    router.push(`/organizations/${slug}`);
  }, [router]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (selectedIndex >= 0 && results[selectedIndex]) {
      handleSelectOrg(results[selectedIndex].slug);
    } else if (trimmed) {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLarge = size === 'large';

  return (
    <div ref={containerRef} className={clsx('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={clsx(
            'relative flex items-center rounded-2xl bg-white border border-slate-200/90 shadow-lg shadow-blue-950/5 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all duration-200',
            isLarge ? 'p-2 sm:p-2.5' : 'p-1.5 sm:p-2',
          )}
        >
          <div className={clsx('flex items-center justify-center text-blue-600 flex-shrink-0 ml-3', isLarge ? 'w-7 h-7' : 'w-5 h-5')}>
            {loading ? (
              <Loader2 className="w-full h-full animate-spin text-blue-600" />
            ) : (
              <Search className="w-full h-full text-blue-600" />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={clsx(
              'w-full bg-transparent px-3 text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none',
              isLarge ? 'text-base sm:text-lg' : 'text-sm sm:text-base',
            )}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full mr-2 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="submit"
            className={clsx(
              'flex-shrink-0 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5',
              isLarge ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm',
            )}
          >
            <span>Qidirish</span>
            <ArrowRight className="w-4 h-4 hidden sm:inline" />
          </button>
        </div>
      </form>

      {/* Real-time Results Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-blue-900/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {loading && results.length === 0 ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Topilgan tashkilotlar ({results.length})</span>
                <span className="text-slate-400 font-normal">Tanlash uchun Enter/Navigatsiya</span>
              </div>

              {results.slice(0, 7).map((org, index) => {
                const primaryContact = org.contacts?.find((c) => c.is_primary) || org.contacts?.[0];
                const phoneObj = primaryContact ? formatPhoneNumber(primaryContact.phone_number) : null;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={org.slug}
                    type="button"
                    onClick={() => handleSelectOrg(org.slug)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={clsx(
                      'w-full p-3.5 flex items-center justify-between gap-3 text-left transition-colors',
                      isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {org.logo_url ? (
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-center flex-shrink-0">
                          <Image
                            src={org.logo_url}
                            alt={org.name}
                            width={28}
                            height={28}
                            className="object-contain max-h-7"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                          {org.name.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm truncate">{org.name}</span>
                          {org.is_verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                          {org.category && <span>{org.category.name}</span>}
                          {org.region && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              • <MapPin className="w-3 h-3 inline" /> {org.region.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {phoneObj && (
                      <div className="flex-shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <Phone className="w-3 h-3" />
                          <span>{phoneObj.display}</span>
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => handleSubmit()}
                className="w-full p-3 bg-blue-50/50 hover:bg-blue-100/60 text-blue-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>Barcha natijalarni ko‘rish ({results.length} ta)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-6 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-800">Natija topilmadi</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                “{query}” so‘rovi bo‘yicha hech qanday tashkilot topilmadi. Boshqa so‘z bilan sinab ko‘ring.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
