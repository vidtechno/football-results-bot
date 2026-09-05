'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  Settings,
  Archive,
  ArrowUp,
  ArrowDown,
  Eye,
  Save,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Work, Chapter, Genre, WorkRevision } from '@/lib/types/platform';

const RichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor').then((mod) => mod.RichTextEditor),
  {
    ssr: false,
    loading: () => <div className="p-8 text-center text-xs text-stone-500 animate-pulse">Matn muharriri yuklanmoqda...</div>,
  }
);

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
  const [genres, setGenres] = useState<Genre[]>([]);
  const [workRevisions, setWorkRevisions] = useState<WorkRevision[]>([]);
  const [chapterRevisions, setChapterRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState<'chapters' | 'settings'>('chapters');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Work Settings Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [type, setType] = useState<'book' | 'serialized_story'>('book');
  const [accessType, setAccessType] = useState<'free' | 'paid_full_work' | 'paid_by_chapter'>('free');
  const [fullWorkPrice, setFullWorkPrice] = useState<string>('15000');
  const [completionStatus, setCompletionStatus] = useState<'ongoing' | 'completed'>('ongoing');
  const [ageRating, setAgeRating] = useState<string>('all');
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [savingWorkSettings, setSavingWorkSettings] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  // Chapter Editor Modal state
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [chapterNumber, setChapterNumber] = useState<number>(1);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterContent, setChapterContent] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [chapterPrice, setChapterPrice] = useState('3000');
  const [savingChapter, setSavingChapter] = useState(false);
  const [chapterError, setChapterError] = useState<string | null>(null);

  const loadWorkAndChapters = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push('/kirish');
        return;
      }

      // Concurrently fetch work with genres, active genres, chapters, and revisions
      const [workRes, genresRes, chapRes, revisionsRes, chapRevisionsRes] = await Promise.all([
        supabase
          .from('works')
          .select(`
            *,
            work_genres (
              genre:genres (*)
            )
          `)
          .eq('id', workId)
          .single(),
        supabase.from('genres').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
        supabase
          .from('chapters')
          .select(`
            *,
            chapter_contents (content)
          `)
          .eq('work_id', workId)
          .order('chapter_number', { ascending: true }),
        supabase
          .from('work_revisions')
          .select('*')
          .eq('work_id', workId)
          .order('created_at', { ascending: false })
          .then((r: any) => r, () => ({ data: [] })),
        supabase
          .from('chapter_revisions')
          .select('*')
          .eq('work_id', workId)
          .order('created_at', { ascending: false })
          .then((r: any) => r, () => ({ data: [] })),
      ]);

      if (workRes.error || !workRes.data) {
        alert('Asar topilmadi');
        router.push('/muallif');
        return;
      }

      const workData = workRes.data;
      setWork(workData as Work);
      setTitle(workData.title || '');
      setDescription(workData.description || '');
      setCoverUrl(workData.cover_url || '');
      setType(workData.type || 'book');
      setAccessType(workData.access_type || 'free');
      setFullWorkPrice(String(workData.full_work_price || '15000'));
      setCompletionStatus(workData.completion_status || 'ongoing');
      setAgeRating(workData.age_rating || 'all');
      setIsArchived(Boolean(workData.is_archived));

      const existingGenres = (workData.work_genres || []).map((wg: any) => wg.genre?.id).filter(Boolean);
      setSelectedGenreIds(existingGenres);

      setGenres((genresRes.data as Genre[]) || []);

      const formattedChapters = (chapRes.data || []).map((c: any) => ({
        ...c,
        content: Array.isArray(c.chapter_contents) ? c.chapter_contents[0]?.content || '' : c.chapter_contents?.content || '',
      }));

      setChapters(formattedChapters as Chapter[]);
      setChapterNumber((formattedChapters.length || 0) + 1);

      if (revisionsRes.data) {
        setWorkRevisions(revisionsRes.data as WorkRevision[]);
      }
      if (chapRevisionsRes.data) {
        setChapterRevisions(chapRevisionsRes.data as any[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workId, router]);

  useEffect(() => {
    loadWorkAndChapters();
  }, [loadWorkAndChapters]);

  // Handle Work Settings Save
  async function handleSaveWorkSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingWorkSettings(true);
    setNotice(null);

    try {
      const endpoint = work?.status === 'published' ? '/api/works/revisions' : '/api/works/save';
      const payload: any = {
        workId,
        id: workId,
        title: title.trim(),
        description: description.trim(),
        coverUrl: coverUrl || null,
        type,
        accessType,
        fullWorkPrice: accessType === 'paid_full_work' ? Number(fullWorkPrice) : 0,
        completionStatus,
        ageRating,
        isArchived,
        genreIds: selectedGenreIds,
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Asarni yangilashda xatolik yuz berdi');
      }

      setNotice({
        type: 'success',
        text: data.isRevision
          ? 'Nashr qilingan asarga kiritilgan o‘zgarishlar alohida tahrir sifatida saqlandi va moderator tekshiruviga yuborildi.'
          : 'Asar ma’lumotlari muvaffaqiyatli saqlandi',
      });
      await loadWorkAndChapters();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setSavingWorkSettings(false);
    }
  }

  // Handle Archive / Soft-Delete
  async function handleToggleArchive() {
    const willArchive = !isArchived;
    const confirmMsg = willArchive
      ? 'Ushbu asarni arxivlashni tasdiqlaysizmi? Asar umumiy ro‘yxatdan yashiriladi, ammo avval xarid qilgan kitobxonlar o‘qish huquqini saqlab qoladi.'
      : 'Asarni arxivdan chiqarib qayta faollashtirishni tasdiqlaysizmi?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/works/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, archive: willArchive }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Amalni bajarib bo‘lmadi');
      }

      setIsArchived(willArchive);
      setNotice({ type: 'success', text: data.message });
      await loadWorkAndChapters();
    } catch (err: any) {
      setNotice({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    }
  }

  // Chapter Open / Edit
  function openNewChapterModal() {
    setEditingChapterId(null);
    setChapterNumber(chapters.length + 1);
    setChapterTitle('');
    setChapterContent('');
    setIsFree(chapters.length === 0);
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

  // Save Chapter with rich text
  async function handleSaveChapter(e: React.FormEvent) {
    e.preventDefault();
    setSavingChapter(true);
    setChapterError(null);

    try {
      const isEditingPublishedChapter = editingChapterId && chapters.find((c) => c.id === editingChapterId)?.status === 'published';
      const endpoint = isEditingPublishedChapter ? '/api/chapters/revisions' : '/api/chapters/save';

      const payload: any = {
        chapterId: editingChapterId || undefined,
        id: editingChapterId || undefined,
        workId,
        chapterNumber,
        title: chapterTitle.trim(),
        content: chapterContent.trim(),
        isFree,
        price: isFree ? 0 : Number(chapterPrice),
        status: 'published',
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Bobni saqlashda xatolik yuz berdi');
      }

      if (data.isRevision) {
        setNotice({
          type: 'success',
          text: 'Nashr qilingan bobga kiritilgan o‘zgarishlar alohida tahrir sifatida saqlandi va moderator tekshiruviga yuborildi.',
        });
      }

      setIsChapterModalOpen(false);
      await loadWorkAndChapters();
    } catch (err: any) {
      setChapterError(err.message || 'Xatolik yuz berdi');
    } finally {
      setSavingChapter(false);
    }
  }

  // Reorder chapters (Move Up / Move Down)
  async function handleMoveChapter(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chapters.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...chapters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const items = reordered.map((ch, idx) => ({
      id: ch.id,
      chapterNumber: idx + 1,
    }));

    try {
      const res = await fetch('/api/chapters/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, items }),
      });
      if (res.ok) {
        await loadWorkAndChapters();
      }
    } catch (err) {
      console.error('Reorder error:', err);
    }
  }

  // Submit for Review
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
        text: 'Asar moderatsiyaga muvaffaqiyatli yuborildi. Administrator tasdig‘idan so‘ng ommaga ko‘rinadi.',
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
      <div className="space-y-6 sm:space-y-8 pb-20">
        <Skeleton className="h-6 w-48" />
        <div className="p-6 sm:p-8 bg-white rounded-3xl border border-[#EAE5DD] space-y-4">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  const isPublished = work.status === 'published';
  const isPending = work.status === 'pending_review';

  return (
    <div className="space-y-6 sm:space-y-8 pb-20">
      {/* Back button */}
      <Link
        href="/muallif"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Muallif studiyasiga qaytish</span>
      </Link>

      {/* Header Info & Actions Card */}
      <div className="editorial-card p-6 sm:p-8 bg-white rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                isArchived
                  ? 'bg-stone-200 text-stone-700'
                  : isPublished
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : isPending
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-stone-100 text-stone-700'
              }`}
            >
              {isArchived
                ? 'Arxivlangan'
                : isPublished
                  ? 'Nashr qilingan'
                  : isPending
                    ? 'Moderatsiyada'
                    : 'Qoralama'}
            </span>

            <span className="text-xs text-stone-500 font-medium">
              {work.access_type === 'free'
                ? 'Bepul mutolaa'
                : work.access_type === 'paid_full_work'
                  ? `To‘liq asar: ${formatUZS(work.full_work_price)}`
                  : 'Bobma-bob to‘lov'}
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            {work.title}
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 max-w-xl font-normal line-clamp-2">
            {work.description || 'Annotatsiya kiritilmagan.'}
          </p>
        </div>

        {/* Primary actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {!isPublished && !isPending && !isArchived && (
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submittingReview ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Yuborilmoqda...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-stone-950" />
                  <span>Moderatsiyaga yuborish</span>
                </>
              )}
            </button>
          )}

          {isPending && (
            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Tekshiruv kutilmoqda</span>
            </div>
          )}

          {isPublished && !isArchived && (
            <Link
              href={`/asarlar/${work.slug}`}
              target="_blank"
              className="px-5 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span>Saytda ko‘rish</span>
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
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {isPublished && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            <span>Asar nashr qilingan holatda</span>
          </p>
          <p className="text-amber-800 font-normal">
            Kiritilgan har qanday o‘zgarish avtomat tarzda tahrir (revision) sifatida saqlanadi. Kitobxonlar hozirgi tasdiqlangan versiyani o‘qishda davom etadilar.
          </p>
        </div>
      )}

      {/* Tabs: Chapters vs Work Settings vs Revisions */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 text-xs font-bold overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('chapters')}
          className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'chapters'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          Boblar ro‘yxati ({chapters.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Asar sozlamalari & Muqova</span>
        </button>

        {(workRevisions.length > 0 || chapterRevisions.length > 0) && (
          <button
            type="button"
            onClick={() => setActiveTab('revisions' as any)}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              (activeTab as any) === 'revisions'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tahrirlar tarixi ({workRevisions.length + chapterRevisions.length})</span>
          </button>
        )}
      </div>

      {/* Tab 1: Chapters List with Reordering */}
      {activeTab === 'chapters' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Mundarija va boblar
            </h2>

            <button
              onClick={openNewChapterModal}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi bob qo‘shish</span>
            </button>
          </div>

          {chapters.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-xs">
              <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <p className="font-serif font-bold text-stone-700 text-sm">
                Ushbu asarda hali boblar yo‘q
              </p>
              <p className="text-stone-400 text-xs mt-1">Birinchi bobni yozish orqali boshlang</p>
              <button
                onClick={openNewChapterModal}
                className="mt-4 px-5 py-2.5 rounded-xl bg-amber-600 text-stone-950 font-bold text-xs shadow-xs"
              >
                1-bobni yozish
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
              {chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-stone-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Reorder up/down buttons */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveChapter(idx, 'up')}
                        className="p-1 rounded text-stone-400 hover:text-stone-800 disabled:opacity-20 transition-colors"
                        title="Yuqoriga surish"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === chapters.length - 1}
                        onClick={() => handleMoveChapter(idx, 'down')}
                        className="p-1 rounded text-stone-400 hover:text-stone-800 disabled:opacity-20 transition-colors"
                        title="Pastga surish"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-800 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {ch.chapter_number}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {ch.title}
                      </h4>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {ch.is_free ? 'Bepul mutolaa' : `Pullik (${formatUZS(ch.price)})`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditChapterModal(ch)}
                      className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-colors"
                    >
                      Tahrirlash
                    </button>
                    {isPublished && (
                      <Link
                        href={`/asarlar/${work.slug}/${ch.slug}`}
                        target="_blank"
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
                        title="Ko‘rish"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Full Work Settings & Cover Upload */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveWorkSettings} className="space-y-6">
          <div className="editorial-card p-6 sm:p-8 bg-white rounded-3xl border border-stone-200 shadow-xs space-y-6">
            <h3 className="font-serif text-lg font-bold text-stone-900 pb-3 border-b border-stone-100">
              Asar asosiy parametrlari
            </h3>

            {/* Cover Upload Dropzone (Replaces URL Input!) */}
            <div>
              <ImageUploadDropzone
                value={coverUrl}
                onChange={(url) => setCoverUrl(url)}
                type="cover"
                workId={workId}
                label="Asar muqovasi (Qurilmadan yuklash)"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Asar nomi</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 font-serif font-bold text-stone-900 text-sm sm:text-base focus:border-amber-600 outline-hidden"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">Asar annotatsiyasi (Tavsif)</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 text-xs sm:text-sm text-stone-900 focus:border-amber-600 outline-hidden leading-relaxed"
                placeholder="Kitobxonlar uchun asar mazmuni haqida qiziqarli ma’lumot..."
              />
            </div>

            {/* Work Type & Access Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Asar formati</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-xs sm:text-sm text-stone-900"
                >
                  <option value="book">Oddiy kitob (Yagona asar)</option>
                  <option value="serialized_story">Davomli qissa (Haftalik serial)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Holati</label>
                <select
                  value={completionStatus}
                  onChange={(e) => setCompletionStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-xs sm:text-sm text-stone-900"
                >
                  <option value="ongoing">Yozilishi davom etmoqda</option>
                  <option value="completed">Tugallangan asar</option>
                </select>
              </div>
            </div>

            {/* Pricing Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Kirish / To‘lov modeli</label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-xs sm:text-sm text-stone-900"
                >
                  <option value="free">To‘liq bepul</option>
                  <option value="paid_full_work">To‘liq asar uchun bitta narx</option>
                  <option value="paid_by_chapter">Bobma-bob to‘lov</option>
                </select>
              </div>

              {accessType === 'paid_full_work' ? (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">To‘liq asar narxi (so‘m)</label>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={fullWorkPrice}
                    onChange={(e) => setFullWorkPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-xs sm:text-sm text-stone-900"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Yosh chegarasi</label>
                  <select
                    value={ageRating}
                    onChange={(e) => setAgeRating(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-bold text-xs sm:text-sm text-stone-900"
                  >
                    <option value="all">Barcha yoshdagilar uchun</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                  </select>
                </div>
              )}
            </div>

            {/* Genres Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">Janrlar</label>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => {
                  const isChecked = selectedGenreIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setSelectedGenreIds((prev) =>
                          isChecked ? prev.filter((id) => id !== g.id) : [...prev, g.id],
                        );
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        isChecked
                          ? 'bg-amber-600 border-amber-600 text-stone-950 shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleToggleArchive}
                className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Archive className="w-4 h-4 text-stone-500" />
                <span>{isArchived ? 'Arxivdan chiqarish' : 'Asarni arxivlash'}</span>
              </button>

              <button
                type="submit"
                disabled={savingWorkSettings}
                className="px-6 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {savingWorkSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>O‘zgarishlarni saqlash</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Revisions History */}
      {(activeTab as any) === 'revisions' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Tahrirlar tarixi va moderatsiya
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-2xs">
            {workRevisions.map((rev) => (
              <div key={`work_${rev.id}`} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700">
                      Asar tahriri
                    </span>
                    <span className="font-bold font-serif text-stone-900 text-sm">{rev.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        rev.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : rev.status === 'pending_review'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {rev.status === 'approved'
                        ? 'Tasdiqlangan'
                        : rev.status === 'pending_review'
                        ? 'Tekshiruvda'
                        : 'Rad etilgan'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Kiritilgan sana: {new Date(rev.created_at).toLocaleDateString('uz-UZ')}
                  </p>
                  {rev.rejection_reason && rev.status === 'rejected' && (
                    <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 mt-2 font-medium">
                      Rad etish sababi: {rev.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {chapterRevisions.map((rev) => (
              <div key={`chap_${rev.id}`} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900">
                      Bob tahriri
                    </span>
                    <span className="font-bold font-serif text-stone-900 text-sm">{rev.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        rev.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : rev.status === 'pending_review'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {rev.status === 'approved'
                        ? 'Tasdiqlangan'
                        : rev.status === 'pending_review'
                        ? 'Tekshiruvda'
                        : 'Rad etilgan'}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Kiritilgan sana: {new Date(rev.created_at).toLocaleDateString('uz-UZ')}
                  </p>
                  {rev.rejection_reason && rev.status === 'rejected' && (
                    <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 mt-2 font-medium">
                      Rad etish sababi: {rev.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Chapter Rich-Text Editor Modal */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-stone-200 p-5 sm:p-8 my-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif font-bold text-lg text-stone-900">
                {editingChapterId ? 'Bobni tahrirlash' : 'Yangi bob yaratish'}
              </h3>
              <button
                type="button"
                onClick={() => setIsChapterModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {chapterError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{chapterError}</span>
              </div>
            )}

            <form onSubmit={handleSaveChapter} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Bob tartib raqami</label>
                  <input
                    type="number"
                    min="1"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-mono font-bold text-stone-900"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">Bob sarlavhasi</label>
                  <input
                    type="text"
                    placeholder="Masalan: Tungi uchrashuv va yangi sir"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 font-serif font-bold text-stone-900"
                    required
                  />
                </div>
              </div>

              {/* Free vs Paid Toggle (when work is paid_by_chapter) */}
              {work.access_type === 'paid_by_chapter' && (
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Ushbu bobni bepul qilish (namuna sifatida)</span>
                  </label>

                  {!isFree && (
                    <div className="pt-1">
                      <label className="block font-bold text-stone-700 mb-1">Bob narxi (so‘m):</label>
                      <input
                        type="number"
                        step="1000"
                        min="1000"
                        value={chapterPrice}
                        onChange={(e) => setChapterPrice(e.target.value)}
                        className="w-full max-w-xs px-3.5 py-2 rounded-xl border border-stone-200 font-bold text-stone-900"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Rich-Text TipTap Editor with Toolbar and Autosave */}
              <div>
                <label className="block font-bold text-stone-700 mb-1.5">Bob matni (Formatlangan matn)</label>
                <RichTextEditor
                  initialContent={chapterContent}
                  onChange={(html) => setChapterContent(html)}
                  storageKey={`manbora_draft_${workId}_${editingChapterId || 'new'}`}
                  placeholder="Bob matnini bu yerga yozing..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsChapterModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingChapter}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-950/20 disabled:opacity-50"
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
