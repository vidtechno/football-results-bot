'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Languages, Loader2, Plus, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { ImageUploadDropzone } from '@/components/ui/ImageUploadDropzone';

type Genre = { id: string; name: string };
type AdminWork = { id: string; title: string; slug: string; status: string; original_author_name: string; source_language: string; translator_name?: string | null };

const emptyForm = { title: '', originalTitle: '', originalAuthorName: '', sourceLanguage: 'Ingliz tili', translatorName: '', rightsBasis: 'public_domain', rightsReference: '', description: '', coverUrl: null as string | null, type: 'book', accessType: 'free', fullWorkPrice: 0, completionStatus: 'completed', genreIds: [] as string[], rightsConfirmed: false };

export default function AdminTranslatedWorksPage() {
  const [works, setWorks] = useState<AdminWork[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const [worksRes, genresRes] = await Promise.all([
      fetch('/api/admin/translated-works').then((r) => r.json()),
      supabase.from('genres').select('id,name').order('name'),
    ]);
    if (worksRes.success) setWorks(worksRes.works);
    else setError(worksRes.error || 'Ma’lumotlarni yuklab bo‘lmadi');
    setGenres(genresRes.data || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const res = await fetch('/api/admin/translated-works', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json(); setSaving(false);
    if (!res.ok || !data.success) return setError(data.error || 'Saqlashda xatolik');
    window.location.href = `/muallif/asar/${data.work.id}`;
  }

  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><h1 className="text-2xl font-black text-slate-900 flex items-center gap-2"><Languages className="h-6 w-6 text-blue-600" /> Tarjima asarlar</h1><p className="mt-1 text-sm text-slate-500">Faqat admin joylaydi; ommaga original muallif ko‘rsatiladi.</p></div>
      <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-bold text-white"><Plus className="h-4 w-4" /> Yangi tarjima asar</button>
    </header>

    {showForm && <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 space-y-5 shadow-sm">
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900"><strong>Huquqiy tekshiruv majburiy:</strong> faqat public domain yoki yozma litsenziyaga ega asarni joylang. Huquq hujjati ommaga ko‘rsatilmaydi.</div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="O‘zbekcha nomi *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
        <Field label="Original nomi" value={form.originalTitle} onChange={(v) => setForm({ ...form, originalTitle: v })} />
        <Field label="Original muallif *" value={form.originalAuthorName} onChange={(v) => setForm({ ...form, originalAuthorName: v })} />
        <Field label="Qaysi tildan *" value={form.sourceLanguage} onChange={(v) => setForm({ ...form, sourceLanguage: v })} />
        <Field label="Tarjimon" value={form.translatorName} onChange={(v) => setForm({ ...form, translatorName: v })} />
        <Field label="Huquq hujjati/havolasi (faqat admin ko‘radi)" value={form.rightsReference} onChange={(v) => setForm({ ...form, rightsReference: v })} />
      </div>
      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Asar tavsifi" rows={5} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
      <ImageUploadDropzone value={form.coverUrl} onChange={(coverUrl) => setForm({ ...form, coverUrl })} />
      <div className="grid sm:grid-cols-3 gap-4">
        <select value={form.rightsBasis} onChange={(e) => setForm({ ...form, rightsBasis: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm"><option value="public_domain">Public domain</option><option value="licensed">Yozma litsenziya/ruxsat</option></select>
        <select value={form.accessType} onChange={(e) => setForm({ ...form, accessType: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm"><option value="free">Bepul</option><option value="paid_full_work">To‘liq pullik</option><option value="paid_by_chapter">Bobma-bob pullik</option></select>
        <select value={form.completionStatus} onChange={(e) => setForm({ ...form, completionStatus: e.target.value })} className="rounded-xl border border-slate-200 p-3 text-sm"><option value="completed">Tugallangan</option><option value="ongoing">Davom etmoqda</option></select>
      </div>
      <div className="flex flex-wrap gap-2">{genres.map((g) => <label key={g.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs"><input type="checkbox" checked={form.genreIds.includes(g.id)} onChange={(e) => setForm({ ...form, genreIds: e.target.checked ? [...form.genreIds, g.id] : form.genreIds.filter((id) => id !== g.id) })} />{g.name}</label>)}</div>
      <label className="flex items-start gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" className="mt-1" checked={form.rightsConfirmed} onChange={(e) => setForm({ ...form, rightsConfirmed: e.target.checked })} /> Ushbu tarjimani nashr qilish uchun qonuniy asos mavjudligini tasdiqlayman.</label>
      {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      <button disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Saqlash va boblarni kiritish'}</button>
    </form>}

    <section className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
      {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div> : works.length ? works.map((work) => <div key={work.id} className="flex items-center justify-between gap-4 border-b last:border-0 border-slate-100 p-4"><div><p className="font-bold text-slate-900">{work.title}</p><p className="text-xs text-slate-500">{work.original_author_name} · {work.source_language} · {work.status}</p></div><div className="flex gap-2"><Link href={`/muallif/asar/${work.id}`} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Boblar va sozlamalar</Link>{work.status === 'published' && <Link href={`/asarlar/${work.slug}`} className="rounded-lg border border-slate-200 p-2"><ExternalLink className="h-4 w-4" /></Link>}</div></div>) : <p className="p-10 text-center text-sm text-slate-500">Hali tarjima asar qo‘shilmagan.</p>}
    </section>
  </div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1"><span className="text-xs font-bold text-slate-600">{label}</span><input required={label.includes('*')} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-sm" /></label>;
}
