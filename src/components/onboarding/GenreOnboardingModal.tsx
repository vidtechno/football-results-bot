'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Check, X, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';

interface GenreOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export function GenreOnboardingModal() {
  const { user, profile, refreshAuth } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [genres, setGenres] = useState<GenreOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only check for logged-in users who haven't completed onboarding
    if (!user) {
      setIsOpen(false);
      return;
    }

    // Check if user already completed onboarding
    if (profile?.onboarding_completed) {
      setIsOpen(false);
      return;
    }

    async function checkOnboarding() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch('/api/user/genres', { headers });
        if (res.ok) {
          const data = await res.json();
          if (!data.onboardingCompleted) {
            setGenres(data.genres || []);
            setSelectedIds(data.selectedGenreIds || []);
            setIsOpen(true);
          }
        }
      } catch {
        // ignore background error
      } finally {
        setLoading(false);
      }
    }

    checkOnboarding();
  }, [user, profile?.onboarding_completed]);

  if (!isOpen) return null;

  const toggleGenre = (id: string) => {
    setErrorMessage(null);
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((gId) => gId !== id));
    } else {
      if (selectedIds.length >= 5) {
        setErrorMessage('Ko‘pi bilan 5 ta janr tanlashingiz mumkin');
        return;
      }
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleSave = async (skip = false) => {
    if (!skip && (selectedIds.length < 3 || selectedIds.length > 5)) {
      setErrorMessage('Iltimos, 3 tadan 5 tagacha janr tanlang');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/user/genres', {
        method: 'POST',
        headers,
        body: JSON.stringify(skip ? { skip: true } : { genreIds: selectedIds }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Saqlashda xatolik yuz berdi');
      }

      setIsOpen(false);
      if (refreshAuth) {
        await refreshAuth();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-stone-200 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
            <Sparkles className="w-6 h-6 text-amber-700" />
          </div>

          <h2 className="text-2xl font-black font-sans text-stone-900 tracking-tight">
            Nimalarni o‘qishni yoqtirasiz?
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 font-medium max-w-md mx-auto">
            Sizga mos sara asarlarni tavsiya qilishimiz uchun 3–5 ta sevimli janringizni tanlang.
          </p>
        </div>

        {/* Counter and Error Notice */}
        <div className="flex items-center justify-between text-xs font-bold px-1">
          <span className="text-stone-500">
            Tanlandi:{' '}
            <strong className={selectedIds.length >= 3 && selectedIds.length <= 5 ? 'text-amber-800' : 'text-stone-700'}>
              {selectedIds.length} / 5 ta
            </strong>
          </span>
          <span className="text-[11px] text-stone-400 font-medium">
            (Kamida 3 ta talab etiladi)
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* Genre Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
          {genres.map((g) => {
            const isSelected = selectedIds.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between gap-1.5 text-left min-h-[44px] ${
                  isSelected
                    ? 'bg-amber-100/90 border-amber-400 text-amber-950 shadow-2xs ring-1 ring-amber-300'
                    : 'bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300'
                }`}
              >
                <span className="truncate">{g.name}</span>
                {isSelected ? (
                  <Check className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions Footer */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            Hozircha o‘tkazib yuborish
          </button>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={submitting || selectedIds.length < 3 || selectedIds.length > 5}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <span>Tanlovni saqlash</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
