import { redirect } from 'next/navigation';
import { createAdminClient, getCurrentProfile } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Highlighter, StickyNote } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Qaydlarim — Manbora' };

export default async function NotesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/kirish?returnUrl=/qaydlar');
  const { data } = await createAdminClient().from('reading_annotations').select(`
    id, quote, note, color, page_number, updated_at,
    work:works(title, slug), chapter:chapters(title, slug, chapter_number)
  `).eq('user_id', profile.id).order('updated_at', { ascending: false }).limit(200);
  const colors: Record<string,string> = { yellow: 'border-yellow-400 bg-yellow-50', green: 'border-emerald-400 bg-emerald-50', blue: 'border-sky-400 bg-sky-50', pink: 'border-pink-400 bg-pink-50' };
  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
    <Link href="/kabinet" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-stone-600"><ArrowLeft className="h-4 w-4" /> Kabinetga qaytish</Link>
    <h1 className="flex items-center gap-3 text-3xl font-black"><Highlighter className="h-8 w-8 text-amber-600" /> Qaydlarim</h1>
    <p className="mt-2 text-stone-500">Saqlagan iqtiboslaringiz, highlight va shaxsiy izohlaringiz barcha qurilmalarda sinxron turadi.</p>
    <div className="mt-8 space-y-4">{(data || []).map((item: any) => <article key={item.id} className={`rounded-2xl border-l-4 p-5 text-stone-900 ${colors[item.color] || colors.yellow}`}>
      <blockquote className="font-serif text-lg italic">“{item.quote}”</blockquote>{item.note && <p className="mt-3 flex gap-2 text-sm"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" />{item.note}</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600"><span>{item.work?.title} · {item.chapter?.chapter_number}-bob · {item.page_number}-sahifa</span><Link className="font-bold text-amber-800" href={`/asarlar/${item.work?.slug}/${item.chapter?.slug}?page=${item.page_number}`}>O‘qishga qaytish →</Link></div>
    </article>)}{!data?.length && <div className="rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500">Hali qayd yo‘q. Kitob o‘qiyotganda matnni belgilang.</div>}</div>
  </main>;
}
