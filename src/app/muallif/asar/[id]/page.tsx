'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Send,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';
import type { Work, Chapter } from '@/lib/types/platform';

interface AuthorWorkEditorPageProps {
  params: {
    id: string;
  };
}

export default function AuthorWorkEditorPage({ params }: AuthorWorkEditorPageProps) {
  const router = useRouter();
  const workId = params.id;

  const [work, setWork] = useState<Work | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Chapter Modal state
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [chapterPrice, setChapterPrice] = useState('3000');
  const [savingChapter, setSavingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkAndChapters();
  }, [workId]);

  async function loadWorkAndChapters() {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/kirish');
        return;
      }

      // 1. Fetch work
      const { data: workData, error: workErr } = await supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .eq('author_id', session.user.id)
        .single();

      if (workErr || !workData) {
        router.push('/muallif');
        return;
      }

      setWork(workData as Work);

      // 2. Fetch chapters
      const { data: chapData } = await supabase
        .from('chapters')
        .select('*')
        .eq('work_id', workId)
        .order('chapter_number', { ascending: true });

      setChapters((chapData as Chapter[]) || []);
      setChapterNumber((chapData?.length || 0) + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openNewChapterModal() {
    setEditingChapterId(null);
    setChapterNumber(chapters.length + 1);
    setChapterTitle('');
    setChapterContent('');
    setIsFree(chapters.length === 0); // first chapter free by default
    setChapterPrice('3000');
    setChapterError(null);
    setIsChapterModalOpen(true);
  }

  function openEditChapterModal(chap: Chapter) {
    setEditingChapterId(chap.id);
    setChapterNumber(chap.chapter_number);
    setChapterTitle(chap.title);
    setChapterContent(chap.content || '');
    setIsFree(chap.is_free);
    setChapterPrice(String(chap.price || 3000));
    setChapterError(null);
    setIsChapterModalOpen(true);
  }

  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    setSavingChapter(true);
    setChapterError(null);

    try {
      const res = await fetch('/api/chapters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingChapterId || undefined,
          workId,
          chapterNumber,
          title: chapterTitle.trim(),
          content: chapterContent.trim(),
          isFree,
          price: isFree ? 0 : Number(chapterPrice),
          status: 'published', // Published by author inside the work
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bobni saqlashda xatolik yuz berdi');
      }

      setIsChapterModalOpen(false);
      await loadWorkAndChapters();
    } catch (err: any) {
      setChapterError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSavingChapter(false);
    }
  }

  async function handleSubmitReview() {
    if (chapters.length === 0) {
      setNotice({
        type: 'error',
        text: 'Asarni moderatsiyaga yuborishdan oldin kamida bitta bob qo‘shishingiz lozim',
      });
      return;
    }

    setSubmittingReview(true);
    setNotice(null);

    try {
      const res = await fetch('/api/works/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Xatolik yuz berdi');
      }

      setNotice({
        type: 'success',
        text: 'Asar moderatsiyaga muvaffaqiyatli yuborildi. Administrator tekshiruvidan so‘ng ommaga e’lon qilinadi.',
      });
      await loadWorkAndChapters();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading || !work) {
    return (
      <div className="p-16 text-center text-slate-500 font-bold text-xs sm:text-sm">
        Asar ma’lumotlari yuklanmoqda...
      </div>
    );
  }

  const isPublished = work.status === 'published';
  const isPending = work.status === 'pending_review';

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Back button */}
      <Link
        href="/muallif"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Muallif studiyasiga qaytish</span>
      </Link>

      {/* Work Card & Status */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                isPublished
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isPending
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isPublished
                ? 'Nashr qilingan'
                : isPending
                  ? 'Moderatsiyada'
                  : 'Qoralama'}
            </span>

            <span className="text-xs text-slate-400 font-medium">
              {work.access_type === 'free'
                ? 'Bepul asar'
                : work.access_type === 'paid_full_work'
                  ? `To‘liq asar narxi: ${formatUZS(work.full_work_price)}`
                  : 'Bobma-bob to‘lov'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {work.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 max-w-xl font-medium">
            {work.description || 'Tavsif mavjud emas.'}
          </p>
        </div>

        {/* Work status action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {!isPublished && !isPending && (
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submittingReview ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Moderatsiyaga yuborish</span>
                </>
              )}
            </button>
          )}

          {isPending && (
            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Tekshiruv kutilmoqda</span>
            </div>
          )}

          {isPublished && (
            <Link
              href={`/asarlar/${work.slug}`}
              target="_blank"
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Platformada ko‘rish</span>
              <ExternalLink className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Chapters Management Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Boblar ro‘yxati ({chapters.length})
            </h2>
          </div>

          <button
            onClick={openNewChapterModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi bob qo‘shish</span>
          </button>
        </div>

        {chapters.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-600 font-bold text-xs sm:text-sm">
              Ushbu asarda hali hech qanday bob yo‘q
            </p>
            <button
              onClick={openNewChapterModal}
              className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
            >
              1-bobni yozish
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                    {ch.chapter_number}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                      {ch.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {ch.is_free ? 'Bepul mutolaa' : `Pullik (${formatUZS(ch.price)})`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEditChapterModal(ch)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Tahrirlash
                  </button>
                  {isPublished && (
                    <Link
                      href={`/asarlar/${work.slug}/${ch.slug}`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Chapter Modal */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-slate-900 mb-4">
              {editingChapterId ? 'Bobni tahrirlash' : 'Yangi bob yaratish'}
            </h3>

            {chapterError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {chapterError}
              </div>
            )}

            <form onSubmit={handleSaveChapter} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Bob raqami
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Bob nomi (Sarlavha)
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: Qorong‘u kechadagi uchrashuv"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Free vs Paid Toggle (when work is paid_by_chapter) */}
              {work.access_type === 'paid_by_chapter' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={isFree}
                        onChange={(e) => setIsFree(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Ushbu bobni bepul qilish (namuna sifatida)</span>
                    </label>
                  </div>

                  {!isFree && (
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Bob narxi (so‘m):
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="1000"
                        value={chapterPrice}
                        onChange={(e) => setChapterPrice(e.target.value)}
                        className="w-full max-w-xs px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-900"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bob matni
                </label>
                <textarea
                  rows={12}
                  placeholder="Bob matnini bu yerga yozing yoki nusxalab joylang..."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-200 font-serif text-sm leading-relaxed text-slate-800 selection:bg-blue-100"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChapterModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingChapter}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  {savingChapter ? 'Saqlanmoqda...' : 'Bobni saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
