import type { Metadata } from 'next';
import { getPublishedWorks } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';
import { PlusSubscribeButton } from '@/components/plus/PlusSubscribeButton';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Manbora Plus — kitoblar va tarjima asarlar | Manbora', description: 'Manbora jamoasi tayyorlagan kitoblar, tarjimalar va hikoyalarni bitta 30 kunlik obuna bilan o‘qing.', alternates: { canonical: '/plus' } };

export default async function PlusPage() {
  const works = await getPublishedWorks({ isPlus: true, limit: 60, sortBy: 'newest' });
  const sections = [
    ['Yangi qo‘shilganlar', works.slice(0, 12)],
    ['Kitoblar', works.filter((w) => w.type === 'book')],
    ['Hikoyalar', works.filter((w) => w.type === 'serialized_story')],
    ['Tarjima asarlar', works.filter((w) => w.is_translation)],
    // 15k words is roughly a sub-90-minute read at the platform's 180 wpm estimate.
    ['Qisqa o‘qishlar', works.filter((w) => Number(w.total_words || 0) > 0 && Number(w.total_words) <= 15000)],
    ['Eng ko‘p o‘qilganlar', [...works].sort((a, b) => Number(b.unique_readers_count || b.view_count || 0) - Number(a.unique_readers_count || a.view_count || 0))],
  ] as const;
  return <div className="space-y-10 pb-20"><section className="overflow-hidden rounded-[32px] border border-amber-200 bg-gradient-to-br from-stone-950 via-emerald-950 to-amber-950 p-7 text-white sm:p-12"><p className="text-xs font-black tracking-[.2em] text-amber-300">MANBORA PLUS</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">Bitta obuna. Ko‘plab asarlar.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-stone-200">Manbora jamoasi tayyorlagan kitoblar, tarjimalar va hikoyalarni bitta obuna bilan o‘qing. Birinchi bob barcha uchun bepul.</p><div className="mt-6"><PlusSubscribeButton /></div></section>{sections.map(([title, items]) => <section key={title} className="space-y-4"><h2 className="text-xl font-black text-stone-950">{title}</h2>{items.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">{items.slice(0, 12).map((work) => <WorkCard key={work.id} work={work} />)}</div> : <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-stone-500">Bu bo‘limga hali asar qo‘shilmagan.</div>}</section>)}</div>;
}
