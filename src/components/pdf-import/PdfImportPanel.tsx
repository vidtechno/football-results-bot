'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  FileUp,
  Loader2,
  Merge,
  Scissors,
  Send,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { ImportChapter, ImportStats } from '@/lib/pdf-import/types';

type ChatMessage = { role: 'user' | 'assistant'; content: string; createdAt?: string };
type ImportSession = {
  id: string;
  work_id: string | null;
  original_filename: string;
  chapters: ImportChapter[];
  unassigned_text: string;
  ignored_metadata?: Array<{ text: string; occurrences: number; action: string }>;
  statistics: ImportStats;
  chat_history?: ChatMessage[];
  warning?: string | null;
  status: string;
};

interface PdfImportPanelProps {
  workId: string;
  workTitle: string;
  defaultAuthorName?: string;
  onImported?: () => void | Promise<void>;
}

export function PdfImportPanel({
  workId,
  workTitle,
  defaultAuthorName = '',
  onImported,
}: PdfImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function authHeaders(json = false) {
    const { data } = await supabase.auth.getSession();
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
    };
  }

  function showError(message: string) {
    setError(message);
    setNotice('');
  }

  async function extract() {
    if (!file || authorName.trim().length < 2) {
      showError('PDF fayl va muallif ism-familiyasini kiriting');
      return;
    }
    setBusy('PDF olinmoqda, boblar va takroriy metadata AI bilan tahlil qilinmoqda…');
    setError('');
    setNotice('');
    const form = new FormData();
    form.set('file', file);
    form.set('workId', workId);
    const response = await fetch('/api/admin/pdf-import?action=extract', {
      method: 'POST',
      headers: await authHeaders(),
      body: form,
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return showError(data.error || 'PDF tahlil qilinmadi');
    setSession(data.session);
    setNotice('PDF bobma-bob ajratildi. Importdan oldin natijani tekshiring.');
  }

  function updateChapter(id: string, changes: Partial<ImportChapter>) {
    setSession((current) =>
      current
        ? {
            ...current,
            chapters: current.chapters.map((chapter) =>
              chapter.id === id ? { ...chapter, ...changes } : chapter,
            ),
          }
        : current,
    );
  }

  function moveChapter(index: number, direction: -1 | 1) {
    setSession((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.chapters.length) return current;
      const chapters = [...current.chapters];
      [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
      return {
        ...current,
        chapters: chapters.map((chapter, order) => ({ ...chapter, order: order + 1 })),
      };
    });
  }

  function splitChapterAtMiddle(index: number) {
    if (!session) return;
    const chapter = session.chapters[index];
    const position = Math.floor(chapter.content.length / 2);
    if (position <= 0 || position >= chapter.content.length) return;
    const sourceOffset = Math.round(
      ((chapter.sourceEnd - chapter.sourceStart) * position) / chapter.content.length,
    );
    const boundary = chapter.sourceStart + sourceOffset;
    const parts: ImportChapter[] = [
      { ...chapter, content: chapter.content.slice(0, position), sourceEnd: boundary },
      {
        ...chapter,
        id: crypto.randomUUID(),
        title: `${chapter.title} — davom`,
        content: chapter.content.slice(position),
        sourceStart: boundary,
        order: chapter.order + 1,
      },
    ];
    setSession({
      ...session,
      chapters: [
        ...session.chapters.slice(0, index),
        ...parts,
        ...session.chapters.slice(index + 1),
      ].map((item, order) => ({ ...item, order: order + 1 })),
    });
  }

  function mergeWithPrevious(index: number) {
    if (!session || index < 1) return;
    const chapters = [...session.chapters];
    const previous = chapters[index - 1];
    const current = chapters[index];
    chapters.splice(index - 1, 2, {
      ...previous,
      content: `${previous.content}\n\n${current.content}`,
      sourceEnd: current.sourceEnd,
      confidence: Math.min(previous.confidence, current.confidence),
    });
    setSession({
      ...session,
      chapters: chapters.map((item, order) => ({ ...item, order: order + 1 })),
    });
  }

  function removeDetectedChapter(index: number) {
    if (!session) return;
    if (!confirm('Bu bo‘lim importdan chiqariladi. Original matn aniqlanmagan qismda saqlanadi.')) {
      return;
    }
    const removed = session.chapters[index];
    setSession({
      ...session,
      chapters: session.chapters
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, order) => ({ ...item, order: order + 1 })),
      unassigned_text: `${session.unassigned_text}\n${removed.content}`.trim(),
    });
  }

  function assignUnassignedToFirstChapter() {
    if (!session?.unassigned_text || !session.chapters.length) return;
    const firstIndex = session.chapters.reduce(
      (best, chapter, index, chapters) =>
        chapter.sourceStart < chapters[best].sourceStart ? index : best,
      0,
    );
    const chapters = [...session.chapters];
    chapters[firstIndex] = {
      ...chapters[firstIndex],
      content: `${session.unassigned_text.trim()}\n\n${chapters[firstIndex].content}`,
      sourceStart: 0,
    };
    setSession({ ...session, chapters, unassigned_text: '' });
  }

  async function save(): Promise<boolean> {
    if (!session) return false;
    setBusy('Tekshiruv saqlanmoqda…');
    setError('');
    const response = await fetch('/api/admin/pdf-import', {
      method: 'PATCH',
      headers: await authHeaders(true),
      body: JSON.stringify({ sessionId: session.id, chapters: session.chapters }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) {
      showError(data.error || 'Tekshiruv saqlanmadi');
      return false;
    }
    setSession(data.session);
    setNotice('O‘zgarishlar saqlandi');
    return true;
  }

  async function analyzeAgain() {
    if (!session || !(await save())) return;
    setBusy('Noaniq boblar AI bilan qayta tekshirilmoqda…');
    const response = await fetch('/api/admin/pdf-import?action=analyze', {
      method: 'POST',
      headers: await authHeaders(true),
      body: JSON.stringify({ sessionId: session.id }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return showError(data.error || 'AI tahlili bajarilmadi');
    setSession(data.session);
    setNotice(data.session.warning || 'AI tahlili yakunlandi');
  }

  async function sendInstruction() {
    if (!session || instruction.trim().length < 3 || !(await save())) return;
    const currentInstruction = instruction.trim();
    setInstruction('');
    setBusy('AI ko‘rsatmani xavfsiz tekshirmoqda…');
    const response = await fetch('/api/admin/pdf-import?action=chat', {
      method: 'POST',
      headers: await authHeaders(true),
      body: JSON.stringify({ sessionId: session.id, instruction: currentInstruction }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return showError(data.error || 'AI ko‘rsatmasi bajarilmadi');
    setSession(data.session);
    setNotice(data.message || 'Ko‘rsatma bajarildi');
  }

  async function importAll() {
    if (!session || !(await save())) return;
    setBusy('Barcha boblar bitta paketda import qilinmoqda…');
    const response = await fetch('/api/admin/pdf-import?action=import', {
      method: 'POST',
      headers: await authHeaders(true),
      body: JSON.stringify({
        sessionId: session.id,
        workId,
        authorName: authorName.trim(),
      }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return showError(data.error || 'Boblar import qilinmadi');
    setSession({ ...session, status: 'completed' });
    setNotice(
      data.result?.workStatus === 'published'
        ? `${data.result.imported} ta bob nashrdagi asarga qo‘shildi.`
        : `${data.result.imported} ta bob import qilindi va asar to‘liq moderatsiyaga yuborildi.`,
    );
    await onImported?.();
  }

  const stats = session?.statistics;
  const canImport = Boolean(
    session &&
    session.chapters.length &&
    !session.unassigned_text &&
    stats?.coverage === 1 &&
    session.status !== 'completed',
  );

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-800 p-2.5 text-white">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-950">PDF + AI orqali boblar yaratish</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Faqat administratorga ochiq. AI tuzilma va takroriy metadata bilan ishlaydi; asarning
              asosiy matnini qayta yozmaydi.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="rounded-2xl border border-stone-200 bg-white p-3 text-xs"
          />
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            maxLength={160}
            placeholder="Kitobning haqiqiy muallifi"
            className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={extract}
          disabled={Boolean(busy)}
          className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-emerald-800 px-5 py-3 text-xs font-bold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
          PDF’ni to‘liq tahlil qilish
        </button>
      </div>

      {busy && <p className="text-xs font-bold text-emerald-800">{busy}</p>}
      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
          {notice}
        </p>
      )}

      {session && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            {[
              ['Sahifalar', stats?.pageCount],
              ['Boblar', session.chapters.length],
              ['Original belgi', stats?.originalCharacters],
              ['Biriktirilgan', stats?.assignedCharacters],
              ['Metadata', stats?.metadataCharacters],
              ['Aniqlanmagan', session.unassigned_text.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border bg-white p-3">
                <p className="text-[10px] font-bold uppercase text-stone-400">{label}</p>
                <p className="text-base font-black">{Number(value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {session.warning && (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              {session.warning}
            </p>
          )}

          <div className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 font-bold text-stone-900">
              <Bot className="h-4 w-4 text-violet-600" /> AI tahrirlash chati
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              Masalan: “Har bobda takrorlangan www.ziyouz.com va sahifa raqamlarini olib tashla”.
            </p>
            {!!session.chat_history?.length && (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-2xl bg-stone-50 p-3">
                {session.chat_history.map((message, index) => (
                  <p
                    key={`${message.role}-${index}`}
                    className={`text-xs ${message.role === 'user' ? 'font-bold text-stone-900' : 'text-emerald-800'}`}
                  >
                    {message.role === 'user' ? 'Siz: ' : 'AI: '}
                    {message.content}
                  </p>
                ))}
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <textarea
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                rows={2}
                maxLength={800}
                placeholder="AI’ga aniq ko‘rsatma yozing…"
                className="min-w-0 flex-1 rounded-2xl border border-stone-200 p-3 text-xs"
              />
              <button
                type="button"
                onClick={sendInstruction}
                disabled={Boolean(busy) || instruction.trim().length < 3}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Yuborish
              </button>
            </div>
          </div>

          {!!session.unassigned_text && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-xs font-bold text-amber-900">
                Aniqlanmagan matn bor. Importdan oldin bobga biriktiring.
              </p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-white p-3 text-[11px] text-stone-600">
                {session.unassigned_text}
              </pre>
              <button
                type="button"
                onClick={assignUnassignedToFirstChapter}
                className="mt-2 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white"
              >
                Birinchi bobga biriktirish
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={analyzeAgain}
              className="rounded-xl border bg-white px-4 py-2 text-xs font-bold"
            >
              AI bilan qayta tekshirish
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-xl border bg-white px-4 py-2 text-xs font-bold"
            >
              Tekshiruvni saqlash
            </button>
            <button
              type="button"
              onClick={importAll}
              disabled={!canImport || Boolean(busy)}
              className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Barcha boblarni “{workTitle}”ga import qilish
            </button>
          </div>

          <div className="space-y-3">
            {session.chapters.map((chapter, index) => (
              <article
                key={chapter.id}
                className={`rounded-3xl border bg-white p-4 ${chapter.confidence < 0.72 ? 'border-amber-300' : 'border-stone-200'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-stone-400">#{index + 1}</span>
                  <input
                    value={chapter.title}
                    onChange={(event) => updateChapter(chapter.id, { title: event.target.value })}
                    className="min-w-48 flex-1 rounded-xl border px-3 py-2 text-xs font-bold"
                  />
                  <span className="text-[11px] text-stone-500">
                    {chapter.content.length.toLocaleString()} belgi ·{' '}
                    {Math.round(chapter.confidence * 100)}%
                  </span>
                </div>
                <textarea
                  value={chapter.content}
                  onChange={(event) => updateChapter(chapter.id, { content: event.target.value })}
                  rows={10}
                  className="mt-3 w-full rounded-2xl border p-3 text-xs leading-6"
                />
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => moveChapter(index, -1)}
                    disabled={!index}
                    title="Yuqoriga"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveChapter(index, 1)}
                    disabled={index === session.chapters.length - 1}
                    title="Pastga"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => splitChapterAtMiddle(index)}
                    className="inline-flex items-center gap-1"
                  >
                    <Scissors className="h-4 w-4" /> Ajratish
                  </button>
                  <button
                    type="button"
                    onClick={() => mergeWithPrevious(index)}
                    disabled={!index}
                    className="inline-flex items-center gap-1"
                  >
                    <Merge className="h-4 w-4" /> Oldingisiga qo‘shish
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDetectedChapter(index)}
                    className="ml-auto text-rose-700"
                    title="Importdan chiqarish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
