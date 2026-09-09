'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PenTool,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone';
import type { Genre } from '@/lib/types/platform';

export default function YangiAsarPage() {
  const router = useRouter();
  const { user, profile, author, isLoading: authLoading } = useAuth();

  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [type, setType] = useState<'book' | 'serialized_story'>('book');
  const [accessType, setAccessType] = useState<'free' | 'paid_full_work'>('free');
  const [fullWorkPrice, setFullWorkPrice] = useState<string>('15000');
  const [selectedGenreId, setSelectedGenreId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Auth Guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/kirish?returnUrl=${encodeURIComponent('/muallif/asar/yangi')}`);
    }
  }, [user, authLoading, router]);

  // 2. Fetch Active Genres
  useEffect(() => {
    let isMounted = true;
    async function loadGenres() {
      try {
        setLoadingGenres(true);
        const { data, error: gErr } = await supabase
          .from('genres')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (!gErr && data && isMounted) {
          setGenres(data as Genre[]);
          if (data.length > 0) {
            setSelectedGenreId((prev) => prev || data[0].id);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoadingGenres(false);
      }
    }

    if (user) {
      loadGenres();
    }

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Loading State
  if (authLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
        <span className="text-xs font-semibold text-stone-500">Yuklanmoqda...</span>
      </div>
    );
  }

  // Non-Author State
  if (user && (!author || author.status !== 'approved')) {
    return (
      <div className="py-16 sm:py-24 max-w-lg mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
          <PenTool className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-stone-900">
            Mualliflik maqomi talab etiladi
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Yangi asar yaratish uchun avval muallif sifatida tasdiqlangan bo‘lishingiz kerak.
            Arizangiz ko‘rib chiqilgach, asar va boblar yaratish imkoniyati ochiladi.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/muallif-boling"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <span>Muallif bo‘lish uchun ariza</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/muallif"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-colors"
          >
            Muallif studiyasiga qaytish
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Asar nomini kiritish majburiy');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/works/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          coverUrl: coverUrl.trim() || null,
          type,
          accessType,
          fullWorkPrice: accessType === 'paid_full_work' ? Number(fullWorkPrice) || 0 : 0,
          genreIds: selectedGenreId ? [selectedGenreId] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Asarni yaratishda xatolik yuz berdi');
      }

      // Successfully created -> Navigate to work editor
      const createdWork = data.work;
      router.push(`/muallif/asar/${createdWork.id}`);
    } catch (err: any) {
      setError(err.message || 'Kutilmagan xatolik yuz berdi');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-16">
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-stone-500 font-semibold">
        <Link href="/muallif" className="hover:text-amber-800 transition-colors">
          Muallif studiyasi
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
        <span className="text-stone-900 font-bold">Yangi asar yaratish</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-amber-100 text-amber-900">
            <BookOpen className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="font-serif font-black text-xl sm:text-2xl text-stone-900">
              Yangi asar yaratish
            </h1>
            <p className="text-xs text-stone-500 font-medium">
              Kitob yoki hikoyangiz ma’lumotlarini kiriting
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-[#EAE5DD] p-6 sm:p-8 shadow-xs space-y-6"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Cover Upload Dropzone */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-2">
            Muqova rasmi (2:3 nisbat)
          </label>
          <ImageUploadDropzone
            value={coverUrl}
            onChange={(url) => setCoverUrl(url || '')}
            type="cover"
            recommendedRatio="2:3 nisbat (masalan: 600x900px)"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-2">
            Asar nomi <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Yulduzli tunlar"
            className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-serif"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-2">
            Asar tavsifi (Annotatsiya)
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Asarning qisqacha mazmuni, syujet kirishi va kitobxonga taassuroti..."
            className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all leading-relaxed"
          />
        </div>

        {/* Type & Genre Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">Asar formati</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
            >
              <option value="book">Kitob</option>
              <option value="serialized_story">Hikoya</option>
            </select>
            <p className="mt-1.5 text-[11px] text-stone-500">
              Har ikki turda ham bitta yoki bir nechta bob yaratishingiz mumkin.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">Asosiy janr</label>
            <select
              value={selectedGenreId}
              onChange={(e) => setSelectedGenreId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
            >
              {genres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Access Model */}
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-2">
            Monetizatsiya modeli
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'free', label: 'To‘liq bepul', desc: 'Barcha boblar ochiq' },
              {
                id: 'paid_full_work',
                label: 'Butun asar to‘lovi',
                desc: 'Kitob to‘liq bir narxda sotiladi',
              },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAccessType(opt.id as any)}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  accessType === opt.id
                    ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                    : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                }`}
              >
                <span className="block text-xs font-bold text-stone-900 mb-0.5">{opt.label}</span>
                <span className="block text-[11px] text-stone-500">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Full Work Price if applicable */}
        {accessType === 'paid_full_work' && (
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Kitob to‘liq narxi (so‘m)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={fullWorkPrice}
              onChange={(e) => setFullWorkPrice(e.target.value)}
              className="w-full sm:w-64 px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-sm font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-4">
          <Link
            href="/muallif"
            className="px-5 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Bekor qilish</span>
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <>
                <span>Asarni yaratish</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
