'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { Star, ThumbsUp, AlertTriangle, Eye, EyeOff, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatUzbekDate } from '@/lib/utils/formatters';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  content: string;
  contains_spoilers: boolean;
  helpful_count: number;
  created_at: string;
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface WorkReviewsSectionProps {
  workId: string;
  workTitle: string;
  initialAverageRating?: number;
  initialRatingCount?: number;
}

export function WorkReviewsSection({
  workId,
  workTitle,
  initialAverageRating = 0,
  initialRatingCount = 0,
}: WorkReviewsSectionProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [userVotedIds, setUserVotedIds] = useState<Set<string>>(new Set());
  const [eligibility, setEligibility] = useState<{ canReview: boolean; reason: string } | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // New review form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadReviews() {
      try {
        const res = await fetch(`/api/reviews?workId=${workId}`);
        const data = await res.json();
        if (isMounted && data.reviews) {
          setReviews(data.reviews);
          setUserVotedIds(new Set(data.userVotedReviewIds || []));
          setEligibility(data.eligibility);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadReviews();
    return () => {
      isMounted = false;
    };
  }, [workId]);

  const handleVoteHelpful = async (reviewId: string) => {
    if (!user) {
      window.location.href = `/kirish?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    try {
      const res = await fetch('/api/reviews/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId }),
      });
      const data = await res.json();
      if (data.success) {
        setUserVotedIds((prev) => {
          const next = new Set(prev);
          if (data.isVoted) next.add(reviewId);
          else next.delete(reviewId);
          return next;
        });

        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, helpful_count: data.helpfulCount } : r))
        );
      }
    } catch (err) {
      console.error('Vote error:', err);
    }
  };

  const toggleSpoiler = (reviewId: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (content.trim().length < 10) {
      setFormError('Taqriz matni kamida 10 ta belgidan iborat bo‘lishi kerak.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workId,
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
          containsSpoilers,
        }),
      });

      const data = await res.json();
      if (data.success && data.review) {
        setReviews([data.review, ...reviews]);
        setFormSuccess('Taqrizingiz muvaffaqiyatli saqlandi! Rahmat.');
        setContent('');
        setTitle('');
        setContainsSpoilers(false);
        setEligibility({ canReview: false, reason: 'Siz bu asarga taqriz qoldirgansiz' });
      } else {
        setFormError(data.error || 'Taqrizni saqlashda xatolik yuz berdi.');
      }
    } catch {
      setFormError('Server bilan aloqa uzildi. Qayta urinib ko‘ring.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : initialAverageRating > 0
    ? initialAverageRating.toFixed(1)
    : '0.0';

  const totalReviews = reviews.length || initialRatingCount;

  return (
    <section className="space-y-6 pt-4">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
              Kitobxonlar fikrlari va taqrizlar
            </h2>
            <p className="text-xs text-stone-500">
              Ushbu asarni o‘qigan kitobxonlarning xolis baholari
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-amber-50 px-3.5 py-1.5 rounded-2xl border border-amber-200/80">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="font-black text-sm text-stone-900">{avgRating}</span>
            <span className="text-xs text-stone-500">/ 5</span>
          </div>
          <span className="text-xs text-stone-500 font-semibold">
            {totalReviews} ta taqriz
          </span>
        </div>
      </div>

      {/* Review Submission Box */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-4">
        <h3 className="font-serif font-bold text-stone-900 text-sm sm:text-base">
          O‘z taqrizi va bahoingizni qoldiring
        </h3>

        {!user ? (
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-stone-600 font-medium">
              Fikr bildirish va baho qo‘yish uchun tizimga kiring.
            </span>
            <a
              href={`/kirish?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-center hover:bg-stone-800 transition-colors"
            >
              Tizimga kirish
            </a>
          </div>
        ) : eligibility && !eligibility.canReview ? (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>{eligibility.reason}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Star Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-600">Bahoingiz:</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-hidden"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold text-amber-800">
                  {rating === 5 ? 'A’lo' : rating === 4 ? 'Yaxshi' : rating === 3 ? 'O‘rtacha' : rating === 2 ? 'Qoniqarsiz' : 'Yomon'}
                </span>
              </div>
            </div>

            {/* Title (Optional) */}
            <div>
              <input
                type="text"
                placeholder="Taqriz sarlavhasi (ixtiyoriy)..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF8F5] border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900"
              />
            </div>

            {/* Content Textarea */}
            <div>
              <textarea
                rows={3}
                required
                placeholder="Asar haqidagi xolis fikrlaringiz, syujet yoki uslub haqida yozing..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF8F5] border border-stone-200 focus:bg-white focus:border-amber-600 focus:ring-2 focus:ring-amber-100 outline-hidden text-xs sm:text-sm text-stone-900"
              />
            </div>

            {/* Spoilers & Submit Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={containsSpoilers}
                  onChange={(e) => setContainsSpoilers(e.target.checked)}
                  className="rounded-md border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span>Taqrizda syujet tafsilotlari (spoyler) mavjud</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saqlanmoqda...' : 'Taqrizni chop etish'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-stone-400">Taqrizlar yuklanmoqda...</div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-xs text-stone-500">
            Hozircha ushbu asarga taqriz yozilmagan. Birinchi bo‘lib o‘z fikringizni bildiring!
          </div>
        ) : (
          reviews.map((r) => {
            const hasVoted = userVotedIds.has(r.id);
            const isSpoilerHidden = r.contains_spoilers && !revealedSpoilers.has(r.id);

            return (
              <div
                key={r.id}
                className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-3"
              >
                {/* User & Rating Info */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-bold flex items-center justify-center overflow-hidden shrink-0">
                      {r.user?.avatar_url ? (
                        <Image src={r.user.avatar_url} alt={r.user.display_name} fill className="object-cover" />
                      ) : (
                        <span>{(r.user?.display_name || 'U').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900">
                        {r.user?.display_name || 'Kitobxon'}
                      </h4>
                      <p className="text-[11px] text-stone-400">{formatUzbekDate(r.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          r.rating >= star ? 'fill-amber-400 text-amber-400' : 'fill-stone-100 text-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Review Title */}
                {r.title && <h5 className="font-serif font-bold text-xs sm:text-sm text-stone-800">{r.title}</h5>}

                {/* Spoiler Mask or Content */}
                {isSpoilerHidden ? (
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-600">
                      <EyeOff className="w-4 h-4 text-amber-700" />
                      <span>Bu taqrizda asar syujeti tafsilotlari (spoyler) mavjud</span>
                    </div>
                    <button
                      onClick={() => toggleSpoiler(r.id)}
                      className="text-xs font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Taqrizni baribir ko‘rsatish</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line font-normal">
                    {r.content}
                  </p>
                )}

                {/* Helpful voting bar */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => handleVoteHelpful(r.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl transition-colors font-semibold ${
                      hasVoted
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Foydali ({r.helpful_count})</span>
                  </button>

                  <span className="text-[11px] text-stone-400">Tasdiqlangan mutolaa</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
