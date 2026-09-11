'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, FileUp, Loader2, Merge, Scissors, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import type { ImportChapter, ImportStats } from '@/lib/pdf-import/types';

type WorkOption = {
  id: string;
  title: string;
  status: string;
  author?: { pen_name?: string } | { pen_name?: string }[];
};
type ImportSession = {
  id: string;
  work_id: string | null;
  original_filename: string;
  chapters: ImportChapter[];
  unassigned_text: string;
  ignored_metadata?: Array<{ text: string; occurrences: number; action: string }>;
  statistics: ImportStats;
  warning?: string | null;
  status: string;
};

function splitChapter(chapter: ImportChapter, position: number): [ImportChapter, ImportChapter] {
  if (position <= 0 || position >= chapter.content.length)
    throw new Error('Ajratish joyi noto‘g‘ri');
  const sourceLength = chapter.sourceEnd - chapter.sourceStart;
  const sourceOffset = Math.round((sourceLength * position) / chapter.content.length);
  const boundary = chapter.sourceStart + sourceOffset;
  return [
    {
      ...chapter,
      content: chapter.content.slice(0, position),
      sourceEnd: boundary,
    },
    {
      ...chapter,
      id: crypto.randomUUID(),
      title: `${chapter.title} — davom`,
      content: chapter.content.slice(position),
      sourceStart: boundary,
      order: chapter.order + 1,
    },
  ];
}
function mergeChapters(first: ImportChapter, second: ImportChapter): ImportChapter {
  return {
    ...first,
    content: `${first.content}\n\n${second.content}`,
    sourceEnd: second.sourceEnd,
    confidence: Math.min(first.confidence, second.confidence),
  };
}

export default function PdfImportPage() {
  const [works, setWorks] = useState<WorkOption[]>([]);
  const [workId, setWorkId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<ImportSession | null>(null);
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
  useEffect(() => {
    void (async () => {
      const response = await fetch('/api/admin/pdf-import', { headers: await authHeaders() });
      const data = await response.json();
      if (response.ok) setWorks(data.works || []);
    })();
  }, []);

  async function extract() {
    if (!file || !workId) return setError('Asar va PDF faylni tanlang');
    setBusy('PDF tekshirilmoqda…');
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
    if (!response.ok) return setError(data.error || 'PDF tahlil qilinmadi');
    setSession(data.session);
    setNotice('Tekshirishga tayyor');
  }

  function updateChapter(id: string, patch: Partial<ImportChapter>) {
    setSession((current) =>
      current
        ? {
            ...current,
            chapters: current.chapters.map((chapter) =>
              chapter.id === id ? { ...chapter, ...patch } : chapter,
            ),
          }
        : current,
    );
  }
  function move(index: number, direction: -1 | 1) {
    setSession((current) => {
      if (!current) return current;
      const next = [...current.chapters];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, chapters: next.map((chapter, i) => ({ ...chapter, order: i + 1 })) };
    });
  }
  function split(index: number) {
    const current = session?.chapters[index];
    if (!current) return;
    const position = current.content.length > 1 ? Math.floor(current.content.length / 2) : 0;
    try {
      const pieces = splitChapter(current, position);
      setSession({
        ...session!,
        chapters: [
          ...session!.chapters.slice(0, index),
          ...pieces,
          ...session!.chapters.slice(index + 1),
        ].map((chapter, i) => ({ ...chapter, order: i + 1 })),
      });
    } catch (e: any) {
      setError(e.message);
    }
  }
  function merge(index: number) {
    if (!session || index < 1) return;
    const chapters = [...session.chapters];
    chapters.splice(index - 1, 2, mergeChapters(chapters[index - 1], chapters[index]));
    setSession({
      ...session,
      chapters: chapters.map((chapter, i) => ({ ...chapter, order: i + 1 })),
    });
  }
  function remove(index: number) {
    if (
      !session ||
      !confirm(
        'Bob olib tashlanadi, uning original matni aniqlanmagan matn maydoniga o‘tadi. Davom etilsinmi?',
      )
    )
      return;
    const chapter = session.chapters[index];
    setSession({
      ...session,
      chapters: session.chapters
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, order: i + 1 })),
      unassigned_text: `${session.unassigned_text}${chapter.content}`,
    });
  }
  function assignUnassignedToFirstChapter() {
    if (!session?.unassigned_text || !session.chapters.length) return;
    const first = [...session.chapters].sort((a, b) => a.sourceStart - b.sourceStart)[0];
    const prefix = session.unassigned_text;
    updateChapter(first.id, {
      content: `${prefix.trim()}\n\n${first.content}`,
      sourceStart: 0,
    });
    setSession((current) => (current ? { ...current, unassigned_text: '' } : current));
  }

  async function save(): Promise<boolean> {
    if (!session) return false;
    setBusy('O‘zgarishlar saqlanmoqda…');
    const response = await fetch('/api/admin/pdf-import', {
      method: 'PATCH',
      headers: await authHeaders(true),
      body: JSON.stringify({
        sessionId: session.id,
        chapters: session.chapters,
        unassignedText: session.unassigned_text,
      }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) {
      setError(data.error);
      return false;
    }
    setSession(data.session);
    setNotice('O‘zgarishlar saqlandi');
    return true;
  }
  async function analyze() {
    if (!session) return;
    setBusy('Noaniq qismlar AI bilan tekshirilmoqda…');
    const response = await fetch('/api/admin/pdf-import?action=analyze', {
      method: 'POST',
      headers: await authHeaders(true),
      body: JSON.stringify({ sessionId: session.id }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return setError(data.error);
    setSession(data.session);
    setNotice(data.session.warning || 'AI tahlili yakunlandi');
  }
  async function importChapters() {
    if (!session) return;
    if (!(await save())) return;
    setBusy('Boblar atomik import qilinmoqda…');
    const response = await fetch('/api/admin/pdf-import?action=import', {
      method: 'POST',
      headers: await authHeaders(true),
      body: JSON.stringify({ sessionId: session.id, workId }),
    });
    const data = await response.json();
    setBusy('');
    if (!response.ok) return setError(data.error);
    setNotice(`${data.result.imported} ta bob draft holatida import qilindi`);
    setSession({ ...session, status: 'completed' });
  }

  const stats = session?.statistics;
  const canImport = Boolean(
    session &&
    !session.unassigned_text &&
    stats?.coverage === 1 &&
    session.chapters.length &&
    session.status !== 'completed',
  );
  const workTitle = useMemo(() => works.find((work) => work.id === workId)?.title, [works, workId]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <FileUp className="text-blue-600" /> PDF kitob import qilish
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Asarni tanlang → PDF yuklang → boblarni tekshiring → draft sifatida import qiling.
        </p>
      </header>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            className="rounded-xl border p-3 text-sm"
          >
            <option value="">Mavjud asarni tanlang</option>
            {works.map((work) => (
              <option key={work.id} value={work.id}>
                {work.title} · {work.status}
              </option>
            ))}
          </select>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="rounded-xl border p-2 text-sm"
          />
          <button
            onClick={extract}
            disabled={!!busy}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Tahlil qilish
          </button>
        </div>
        <Link href="/muallif/asar/yangi" className="text-xs font-bold text-blue-700">
          Yangi asar yaratish →
        </Link>
        {busy && (
          <p className="flex items-center gap-2 text-sm font-bold text-blue-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            {busy}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>
        )}
        {notice && (
          <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
            {notice}
          </p>
        )}
      </section>
      {session && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            {[
              ['PDF sahifalari', stats?.pageCount],
              ['Ajratilgan boblar', session.chapters.length],
              ['Original belgilar', stats?.originalCharacters],
              ['Biriktirilgan', stats?.assignedCharacters],
              ['Metadata', stats?.metadataCharacters],
              ['Aniqlanmagan', session.unassigned_text.length],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border bg-white p-3">
                <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
                <p className="text-lg font-black">{Number(value || 0).toLocaleString()}</p>
              </div>
            ))}
          </section>
          {session.unassigned_text && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                Aniqlanmagan matn — importdan oldin tegishli bobga qo‘shing
              </p>
              <textarea
                value={session.unassigned_text}
                onChange={(e) => setSession({ ...session, unassigned_text: e.target.value })}
                rows={6}
                className="mt-2 w-full rounded-xl border p-3 text-sm"
              />
              <button
                onClick={assignUnassignedToFirstChapter}
                className="mt-2 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white"
              >
                Birinchi bobga biriktirish
              </button>
            </section>
          )}
          {!!session.ignored_metadata?.length && (
            <details className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-bold">
                Xavfsiz ajratilgan sahifa header/footerlari ({session.ignored_metadata.length}) —
                asl PDF nusxasida saqlangan
              </summary>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {session.ignored_metadata.map((item, index) => (
                  <li key={`${item.text}-${index}`}>
                    “{item.text}” · {item.occurrences} sahifada
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={analyze}
              className="rounded-xl border bg-white px-4 py-2 text-xs font-bold"
            >
              AI bilan noaniq joylarni tekshirish
            </button>
            <button
              onClick={save}
              className="rounded-xl border bg-white px-4 py-2 text-xs font-bold"
            >
              Tekshiruvni saqlash
            </button>
            <button
              onClick={importChapters}
              disabled={!canImport || !!busy}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              {workTitle} asariga import qilish
            </button>
          </div>
          <section className="space-y-4">
            {session.chapters.map((chapter, index) => (
              <article
                key={chapter.id}
                className={`rounded-3xl border bg-white p-4 ${chapter.confidence < 0.72 ? 'border-amber-300' : 'border-slate-200'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-slate-400">#{index + 1}</span>
                  <input
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapter.id, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm font-bold"
                  />
                  <span className="text-xs text-slate-500">
                    {chapter.content.length.toLocaleString()} belgi ·{' '}
                    {chapter.content.trim().split(/\s+/).length.toLocaleString()} so‘z ·{' '}
                    {Math.round(chapter.confidence * 100)}%
                  </span>
                  {chapter.confidence < 0.72 && (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">
                      Qo‘lda tekshiring
                    </span>
                  )}
                </div>
                <textarea
                  value={chapter.content}
                  onChange={(e) => updateChapter(chapter.id, { content: e.target.value })}
                  rows={10}
                  className="mt-3 w-full rounded-xl border p-3 text-sm leading-6"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => move(index, -1)} disabled={!index} title="Yuqoriga">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === session.chapters.length - 1}
                    title="Pastga"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button onClick={() => split(index)} className="flex items-center gap-1 text-xs">
                    <Scissors className="h-4 w-4" /> Split
                  </button>
                  <button
                    onClick={() => merge(index)}
                    disabled={!index}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Merge className="h-4 w-4" /> Oldingisi bilan birlashtirish
                  </button>
                  <button onClick={() => remove(index)} className="ml-auto text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
