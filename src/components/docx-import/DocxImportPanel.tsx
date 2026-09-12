'use client';

import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  FileText,
  Loader2,
  Merge,
  Scissors,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { htmlToPlainText, splitDocxBlocks } from '@/lib/docx-import/text';
import type { AiSuggestion, DocxChapter, DocxImportStats } from '@/lib/docx-import/types';

type ImportSession = {
  id: string;
  original_filename: string;
  status: string;
  chapters: DocxChapter[];
  suggestions: AiSuggestion[];
  statistics: DocxImportStats;
  warnings: string[];
};

interface DocxImportPanelProps {
  workId: string;
  workTitle: string;
  onImported?: () => void | Promise<void>;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function importRequest(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({
      error:
        response.status === 413
          ? 'Fayl server yuklash limitidan katta. Hujjatni kichikroq qismlarga ajrating.'
          : 'Server javobi olinmadi. Qayta urinib ko‘ring.',
    }));
    return { ok: response.ok, json: async () => data };
  } finally {
    clearTimeout(timeout);
  }
}

function htmlBlocks(html: string) {
  return splitDocxBlocks(html);
}

export function DocxImportPanel({ workId, workTitle, onImported }: DocxImportPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [instruction, setInstruction] = useState('Texnik xatolar va shubhali formatlarni tekshir');
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function headers(json = false) {
    const { data } = await supabase.auth.getSession();
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(data.session?.access_token
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
    };
  }

  function fail(message: string) {
    setError(message);
    setNotice('');
    setStage('');
  }

  async function run(action: () => Promise<unknown>) {
    if (stage) return;
    try {
      await action();
    } catch {
      fail('So‘rov bajarilmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.');
    } finally {
      setStage('');
    }
  }

  async function extract() {
    if (!file) return fail('DOCX faylni tanlang');
    setError('');
    setNotice('');
    setStage('Fayl yuklanmoqda…');
    const form = new FormData();
    form.set('file', file);
    form.set('workId', workId);
    const response = await importRequest('/api/docx-import?action=extract', {
      method: 'POST',
      headers: await headers(),
      body: form,
    });
    setStage('Matn o‘qilmoqda va boblar aniqlanmoqda…');
    const data = await response.json();
    if (!response.ok) return fail(data.error || 'DOCX tahlil qilinmadi');
    setSession(data.session);
    setStage('');
    setNotice(data.reused ? 'Oldingi preview tiklandi.' : 'Preview tayyor. Boblarni tekshiring.');
  }

  function setChapters(chapters: DocxChapter[]) {
    setSession((current) =>
      current
        ? {
            ...current,
            chapters: chapters.map((chapter, order) => ({ ...chapter, order: order + 1 })),
          }
        : current,
    );
  }

  function updateTitle(id: string, title: string) {
    if (!session) return;
    setChapters(
      session.chapters.map((chapter) => (chapter.id === id ? { ...chapter, title } : chapter)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    if (!session) return;
    const target = index + direction;
    if (target < 0 || target >= session.chapters.length) return;
    const chapters = [...session.chapters];
    [chapters[index], chapters[target]] = [chapters[target], chapters[index]];
    setChapters(chapters);
  }

  function split(index: number) {
    if (!session) return;
    const chapter = session.chapters[index];
    const blocks = htmlBlocks(chapter.contentHtml);
    if (blocks.length < 2) return fail('Bu bobda ajratish uchun kamida ikkita paragraf kerak');
    const cut = Math.ceil(blocks.length / 2);
    const leftHtml = blocks.slice(0, cut).join('');
    const rightHtml = blocks.slice(cut).join('');
    setChapters([
      ...session.chapters.slice(0, index),
      { ...chapter, contentHtml: leftHtml, plainText: htmlToPlainText(leftHtml) },
      {
        ...chapter,
        id: crypto.randomUUID(),
        title: `${chapter.title} — davom`,
        contentHtml: rightHtml,
        plainText: htmlToPlainText(rightHtml),
      },
      ...session.chapters.slice(index + 1),
    ]);
  }

  function merge(index: number, direction: -1 | 1) {
    if (!session) return;
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= session.chapters.length) return;
    const start = Math.min(index, otherIndex);
    const first = session.chapters[start];
    const second = session.chapters[start + 1];
    const contentHtml = `${first.contentHtml}${second.contentHtml}`;
    const chapters = [...session.chapters];
    chapters.splice(start, 2, { ...first, contentHtml, plainText: htmlToPlainText(contentHtml) });
    setChapters(chapters);
  }

  function removeEmpty(index: number) {
    if (!session) return;
    if (session.chapters[index].plainText.trim()) return fail('Faqat bo‘sh bobni o‘chirish mumkin');
    setChapters(session.chapters.filter((_, itemIndex) => itemIndex !== index));
  }

  async function save() {
    if (!session) return false;
    setStage('Preview saqlanmoqda…');
    const response = await importRequest('/api/docx-import', {
      method: 'PATCH',
      headers: await headers(true),
      body: JSON.stringify({ workId, sessionId: session.id, chapters: session.chapters }),
    });
    const data = await response.json();
    setStage('');
    if (!response.ok) {
      fail(data.error || 'Preview saqlanmadi');
      return false;
    }
    setSession(data.session);
    setNotice('Preview saqlandi');
    return true;
  }

  async function analyze() {
    if (!session || !(await save())) return;
    setStage('AI texnik xatolarni tekshirmoqda…');
    const response = await importRequest('/api/docx-import?action=analyze', {
      method: 'POST',
      headers: await headers(true),
      body: JSON.stringify({ workId, sessionId: session.id, instruction }),
    });
    const data = await response.json();
    setStage('');
    if (!response.ok) return fail(data.error || 'AI tekshiruvi bajarilmadi');
    setSession(data.session);
    setNotice(
      data.warning || 'AI faqat texnik takliflarni tayyorladi. Hech narsa avtomatik o‘zgarmadi.',
    );
  }

  async function decide(suggestionId: string, decision: 'accept' | 'reject') {
    if (!session) return;
    setStage(decision === 'accept' ? 'Taklif qo‘llanmoqda…' : 'Taklif rad etilmoqda…');
    const response = await importRequest('/api/docx-import?action=suggestion', {
      method: 'POST',
      headers: await headers(true),
      body: JSON.stringify({ workId, sessionId: session.id, suggestionId, decision }),
    });
    const data = await response.json();
    setStage('');
    if (!response.ok) return fail(data.error || 'Taklif holati saqlanmadi');
    setSession(data.session);
  }

  async function importAll() {
    if (!session || !(await save())) return;
    setStage('Boblar atomik import qilinmoqda…');
    const response = await importRequest('/api/docx-import?action=import', {
      method: 'POST',
      headers: await headers(true),
      body: JSON.stringify({ workId, sessionId: session.id }),
    });
    const data = await response.json();
    setStage('');
    if (!response.ok) return fail(data.error || 'Boblar import qilinmadi');
    setNotice(`${data.result?.imported || session.chapters.length} ta bob import qilindi.`);
    setSession({ ...session, status: 'completed' });
    await onImported?.();
  }

  const stats = session?.statistics;
  const canImport = Boolean(session && !stats?.suspiciousLoss && session.status !== 'completed');

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-blue-700 p-2.5 text-white">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-950">DOCX orqali import</h2>
            <p className="mt-1 text-xs leading-relaxed text-stone-600">
              Word hujjati serverda o‘qiladi. Matn preview tasdiqlanmaguncha asarga yozilmaydi.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="file"
            accept={`.docx,${DOCX_MIME}`}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white p-3 text-xs"
          />
          <button
            type="button"
            onClick={() => void run(extract)}
            disabled={!file || Boolean(stage)}
            className="rounded-2xl bg-blue-700 px-5 py-3 text-xs font-bold text-white disabled:opacity-40"
          >
            DOCX’ni tahlil qilish
          </button>
        </div>
      </div>

      {stage && (
        <p className="flex items-center gap-2 text-xs font-bold text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          {stage}
        </p>
      )}
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
              ['Boblar', session.chapters.length],
              ['Paragraflar', stats?.paragraphCount],
              ['Original so‘z', stats?.originalWords],
              ['Final so‘z', stats?.finalWords],
              ['Saqlanish', `${Math.round((stats?.textRetention || 0) * 100)}%`],
              ['Holat', stats?.suspiciousLoss ? 'Tekshiring' : 'Yaxlit'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border bg-white p-3">
                <p className="text-[10px] font-bold uppercase text-stone-400">{label}</p>
                <p className="mt-1 text-sm font-black text-stone-900">{value}</p>
              </div>
            ))}
          </div>

          {session.warnings?.map((warning) => (
            <p
              key={warning}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
            >
              {warning}
            </p>
          ))}
          {stats?.suspiciousLoss && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
              Import vaqtida matnning bir qismi yo‘qolishi mumkin. Iltimos, faylni tekshiring.
            </p>
          )}

          <div className="rounded-3xl border bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm font-black">
              <Bot className="h-4 w-4 text-violet-600" />
              AI texnik yordamchi
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              AI matnni avtomatik o‘zgartirmaydi. Har bir taklifni siz qabul yoki rad etasiz.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                maxLength={500}
                className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => void run(analyze)}
                disabled={Boolean(stage)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white"
              >
                <Send className="h-4 w-4" />
                Tekshirtirish
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {session.suggestions?.map((suggestion) => (
                <div key={suggestion.id} className="rounded-2xl border bg-stone-50 p-3 text-xs">
                  <p className="font-bold text-stone-900">{suggestion.explanation}</p>
                  <p className="mt-1 text-stone-500">
                    “{suggestion.before}” → “{suggestion.after || 'olib tashlash'}”
                  </p>
                  {suggestion.status === 'pending' ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void run(() => decide(suggestion.id, 'accept'))}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 font-bold text-white"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Qabul qilish
                      </button>
                      <button
                        type="button"
                        onClick={() => void run(() => decide(suggestion.id, 'reject'))}
                        className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-bold"
                      >
                        <X className="h-3.5 w-3.5" />
                        Rad etish
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 font-bold text-stone-500">
                      {suggestion.status === 'accepted' ? 'Qabul qilindi' : 'Rad etildi'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void run(save)}
              className="rounded-xl border bg-white px-4 py-2 text-xs font-bold"
            >
              Previewni saqlash
            </button>
            <button
              type="button"
              onClick={() => void run(importAll)}
              disabled={!canImport || Boolean(stage)}
              className="rounded-xl bg-emerald-800 px-5 py-2 text-xs font-bold text-white disabled:opacity-40"
            >
              Tasdiqlash va “{workTitle}”ga import qilish
            </button>
          </div>

          <div className="space-y-3">
            {session.chapters.map((chapter, index) => (
              <article key={chapter.id} className="rounded-3xl border bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-stone-400">#{index + 1}</span>
                  <input
                    value={chapter.title}
                    onChange={(event) => updateTitle(chapter.id, event.target.value)}
                    maxLength={180}
                    className="min-w-48 flex-1 rounded-xl border px-3 py-2 text-xs font-bold"
                  />
                  <span className="text-[11px] text-stone-500">
                    {chapter.plainText.split(/\s+/u).filter(Boolean).length.toLocaleString()} so‘z ·{' '}
                    {Math.round(chapter.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-3 line-clamp-4 whitespace-pre-line rounded-2xl bg-stone-50 p-3 text-xs leading-6 text-stone-700">
                  {chapter.plainText.slice(0, 800)}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={!index}
                    title="Yuqoriga"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === session.chapters.length - 1}
                    title="Pastga"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => split(index)}
                    className="inline-flex items-center gap-1"
                  >
                    <Scissors className="h-4 w-4" />
                    Ajratish
                  </button>
                  <button
                    type="button"
                    onClick={() => merge(index, -1)}
                    disabled={!index}
                    className="inline-flex items-center gap-1"
                  >
                    <Merge className="h-4 w-4" />
                    Oldingisiga qo‘shish
                  </button>
                  <button
                    type="button"
                    onClick={() => merge(index, 1)}
                    disabled={index === session.chapters.length - 1}
                    className="inline-flex items-center gap-1"
                  >
                    <Merge className="h-4 w-4" />
                    Keyingisiga qo‘shish
                  </button>
                  {!chapter.plainText.trim() && (
                    <button
                      type="button"
                      onClick={() => removeEmpty(index)}
                      className="ml-auto text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
