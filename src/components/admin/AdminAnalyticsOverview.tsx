'use client';
import { useEffect, useState } from 'react';
import { Activity, Eye, Users, UserPlus, MonitorSmartphone } from 'lucide-react';

type Data = { online:number; visitorsToday:number; visitors7:number; visitors30:number; pageViewsToday:number; registrations:{today:number;seven:number;thirty:number}; devices:[string,number][]; sources:[string,number][]; topWorks:{id:string;title:string;count:number}[] };

export function AdminAnalyticsOverview() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { fetch('/api/admin/analytics').then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData).catch(() => setError(true)); }, []);
  if (error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Ichki analitikani yuklab bo‘lmadi. 027 migratsiya bajarilganini tekshiring.</div>;
  if (!data) return <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />;
  const cards = [{l:'Hozir onlayn',v:data.online,i:Activity},{l:'Bugungi tashrifchilar',v:data.visitorsToday,i:Users},{l:'7 kunlik tashrifchilar',v:data.visitors7,i:Eye},{l:'30 kunlik tashrifchilar',v:data.visitors30,i:MonitorSmartphone},{l:'Bugungi sahifa ko‘rishlar',v:data.pageViewsToday,i:Eye},{l:'Bugun ro‘yxatdan o‘tgan',v:data.registrations.today,i:UserPlus}];
  return <section className="space-y-4"><div><h2 className="text-lg font-black text-slate-900">Sayt analitikasi</h2><p className="text-xs text-slate-500">Google Analytics’siz, Manbora ichida yig‘ilgan maxfiylikka e’tiborli statistika</p></div><div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{cards.map(({l,v,i:Icon})=><div key={l} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="h-4 w-4 text-blue-600"/><strong className="mt-2 block text-2xl">{v}</strong><span className="text-xs text-slate-500">{l}</span></div>)}</div><div className="grid gap-4 lg:grid-cols-3"><List title="Ommabop asarlar" rows={data.topWorks.map(x=>[x.title,x.count])}/><List title="Qurilmalar" rows={data.devices}/><List title="Tashrif manbalari" rows={data.sources}/></div><p className="text-xs text-slate-500">Ro‘yxatdan o‘tish: 7 kunda {data.registrations.seven}, 30 kunda {data.registrations.thirty} ta.</p></section>;
}
function List({title,rows}:{title:string;rows:[string,number][]}) { return <div className="rounded-2xl border border-slate-200 bg-white p-4"><h3 className="mb-3 text-sm font-bold">{title}</h3>{rows.length ? rows.map(([name,count])=><div key={name} className="flex justify-between gap-2 border-t border-slate-100 py-2 text-xs"><span className="truncate">{name}</span><strong>{count}</strong></div>) : <p className="text-xs text-slate-400">Hali ma’lumot yo‘q</p>}</div> }
