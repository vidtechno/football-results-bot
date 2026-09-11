'use client';
import { useCallback, useEffect, useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatUZS } from '@/lib/utils/currency';

export default function AdminPlusPage() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState('');
  async function headers() { const { data } = await supabase.auth.getSession(); return { Authorization: `Bearer ${data.session?.access_token || ''}`, 'Content-Type': 'application/json' }; }
  const load = useCallback(async () => { const response = await fetch('/api/admin/plus', { headers: await headers() }); setData(await response.json()); }, []);
  useEffect(() => { void load(); }, [load]);
  async function toggle(work: any) { setBusy(work.id); const response = await fetch('/api/admin/plus', { method: 'PATCH', headers: await headers(), body: JSON.stringify({ workId: work.id, isPlus: !work.is_plus }) }); setBusy(''); if (response.ok) await load(); }
  if (!data) return <Loader2 className="mx-auto mt-20 animate-spin" />;
  return <div className="space-y-6"><header><h1 className="flex items-center gap-2 text-2xl font-black"><Crown className="text-amber-500" /> Manbora Plus</h1><p className="text-sm text-slate-500">Katalog, faol obunalar va obuna daromadi.</p></header><section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-slate-500">30 kunlik narx</p><strong>{formatUZS(data.price)}</strong></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-slate-500">Faol obunalar</p><strong>{data.activeCount}</strong></div><div className="rounded-2xl border bg-white p-5"><p className="text-xs text-slate-500">Jami Plus daromadi</p><strong>{formatUZS(data.totalRevenue)}</strong></div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-black">Oyma-oy daromad</h2><div className="mt-3 space-y-2">{data.monthly.length ? data.monthly.map((row: any) => <div key={row.month} className="flex justify-between border-b py-2 text-sm"><span>{row.month}</span><strong>{formatUZS(row.revenue)}</strong></div>) : <p className="text-sm text-slate-500">Hali Plus daromadi yo‘q.</p>}</div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-black">Admin yaratgan asarlar</h2><div className="mt-3 divide-y">{data.works.map((work: any) => <div key={work.id} className="flex items-center justify-between gap-3 py-3"><div><strong className="text-sm">{work.title}</strong><p className="text-xs text-slate-500">{work.status}</p></div><button disabled={busy === work.id} onClick={() => toggle(work)} className={`rounded-xl px-4 py-2 text-xs font-black ${work.is_plus ? 'bg-amber-100 text-amber-900' : 'bg-slate-100'}`}>{work.is_plus ? 'Plus tarkibida' : 'Plus’ga qo‘shish'}</button></div>)}</div></section></div>;
}
