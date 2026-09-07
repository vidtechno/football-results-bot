'use client';
import { useEffect, useState } from 'react';
import { Bookmark, CheckCircle2, Eye, User, Users } from 'lucide-react';

type Stats = { views:number; readers:number; bookmarks:number; completed:number; followers:number };
export function PublicWorkStats({ workId, initialFollowers }: { workId:string; initialFollowers:number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    const load = () => { void fetch(`/api/works/${workId}/stats`, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject()).then(setStats).catch(() => {}); };
    load();
    const refresh = (event: Event) => { if ((event as CustomEvent).detail?.workId === workId) load(); };
    window.addEventListener('manbora:work-view-recorded', refresh);
    return () => window.removeEventListener('manbora:work-view-recorded', refresh);
  }, [workId]);
  const items = [{label:'Ko‘rishlar',value:stats?.views,icon:Eye},{label:'Kitobxonlar',value:stats?.readers,icon:Users},{label:'Xatcho‘plar',value:stats?.bookmarks,icon:Bookmark},{label:'Yakunlaganlar',value:stats?.completed,icon:CheckCircle2},{label:'Kuzatuvchilar',value:stats?.followers ?? initialFollowers,icon:User}];
  return <section aria-label="Asar statistikasi" className="grid grid-cols-2 sm:grid-cols-5 gap-3">{items.map(x=><div key={x.label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs"><x.icon className="h-4 w-4 text-emerald-700"/><strong className="mt-2 block text-xl text-stone-900">{x.value ?? <span className="inline-block h-6 w-10 animate-pulse rounded bg-stone-200"/>}</strong><span className="text-xs text-stone-500">{x.label}</span></div>)}</section>;
}
