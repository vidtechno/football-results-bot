import type { Metadata } from 'next';
import Link from 'next/link';
import { Languages, Search } from 'lucide-react';
import { getPaginatedCatalogue } from '@/lib/db/queries';
import { WorkCard } from '@/components/work/WorkCard';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'O‘zbek tiliga tarjima qilingan asarlar',
  description: 'Manbora tahririyati huquqiy asosi tekshirilgan holda o‘zbek tilida taqdim etgan tarjima asarlar.',
  alternates: { canonical: '/tarjima-asarlar' },
};

export default async function TranslatedWorksPage({ searchParams }: { searchParams: { q?: string; language?: string; page?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getPaginatedCatalogue({
    page,
    pageSize: 20,
    query: searchParams.q,
    sourceLanguage: searchParams.language,
    isTranslation: true,
    sortBy: 'newest',
  });

  const languages = ['Ingliz tili', 'Rus tili', 'Turk tili', 'Arab tili', 'Fors tili'];
  const pageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (searchParams.q) params.set('q', searchParams.q);
    if (searchParams.language) params.set('language', searchParams.language);
    params.set('page', String(nextPage));
    return `/tarjima-asarlar?${params}`;
  };

  return (
    <div className="space-y-8 pb-16">
      <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-950 to-emerald-800 p-6 sm:p-10 text-white">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold"><Languages className="h-4 w-4" /> Tarjima asarlar</span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">Dunyo adabiyoti o‘zbek tilida</h1>
          <p className="text-sm sm:text-base text-emerald-50/85 leading-relaxed">Original muallif nomi, tarjima qilingan til va tarjimon ma’lumoti ochiq ko‘rsatilgan saralangan asarlar.</p>
        </div>
      </section>

      <form className="flex flex-col sm:flex-row gap-3" action="/tarjima-asarlar">
        <label className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input name="q" defaultValue={searchParams.q} placeholder="Asar yoki original muallifni qidiring" className="w-full rounded-2xl border border-stone-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-600" />
        </label>
        <select name="language" defaultValue={searchParams.language || ''} className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold">
          <option value="">Barcha tillar</option>
          {languages.map((language) => <option key={language} value={language}>{language}</option>)}
        </select>
        <button className="rounded-2xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700">Qidirish</button>
      </form>

      {result.works.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {result.works.map((work) => <WorkCard key={work.id} work={work} />)}
        </div>
      ) : (
        <div className="rounded-3xl border border-stone-200 bg-white py-16 text-center">
          <Languages className="mx-auto h-10 w-10 text-stone-300" />
          <h2 className="mt-4 font-bold text-stone-900">Tarjima asarlar topilmadi</h2>
          <p className="mt-1 text-sm text-stone-500">Filtrni o‘zgartiring yoki keyinroq qayta kiring.</p>
        </div>
      )}

      {result.totalPages > 1 && <nav className="flex justify-center gap-2">{Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => <Link key={n} href={pageHref(n)} className={`rounded-xl px-4 py-2 text-sm font-bold ${n === page ? 'bg-emerald-800 text-white' : 'border border-stone-200 bg-white text-stone-700'}`}>{n}</Link>)}</nav>}
    </div>
  );
}
