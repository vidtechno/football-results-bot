'use client';
import { useEffect, useState } from 'react';
import { Award, BookOpen, Flame, Target, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const BADGES: Record<string, { label: string; icon: string }> = {
  first_page: { label: 'Birinchi qadam', icon: '📖' }, first_chapter: { label: 'Bob zabt etildi', icon: '🏁' },
  book_finisher: { label: 'Kitobxon', icon: '🏆' }, hundred_pages: { label: '100 sahifa', icon: '💯' },
};

export function ReadingStreakCard() {
  const [data, setData] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    supabase.auth.getSession().then(({ data: auth }) => fetch('/api/reader/streak', { headers: auth.session ? { Authorization: `Bearer ${auth.session.access_token}` } : {} }))
      .then(r => r.ok ? r.json() : null).then(setData).catch(() => {});
  }, []);
  const restore = async () => { setRestoring(true); setMessage(''); const {data:auth}=await supabase.auth.getSession(); const res=await fetch('/api/reader/streak',{method:'POST',headers:{'Content-Type':'application/json',...(auth.session?{Authorization:`Bearer ${auth.session.access_token}`}:{})},body:JSON.stringify({date:data.restoreDate})}); const json=await res.json(); if(res.ok){setMessage(`Streak tiklandi! ${json.xpCost} XP sarflandi.`); setData((old:any)=>({...old,availableXp:json.availableXp,protectionsRemaining:json.remainingThisMonth,protectionsUsed:old.protectionsUsed+1,canRestore:false,current:old.current+1}));}else setMessage(json.error||'Tiklab bo‘lmadi'); setRestoring(false); };
  if (!data) return <div className="h-40 animate-pulse rounded-3xl bg-stone-100 dark:bg-stone-900" />;
  return <section className="overflow-hidden rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 dark:border-orange-950 dark:from-stone-900 dark:via-stone-950 dark:to-amber-950/30">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="flex items-center gap-2 text-sm font-black text-orange-700"><Flame className="h-5 w-5 fill-orange-500" /> Mutolaa streak’i</p><p className="mt-1 text-3xl font-black">{data.current} kun</p><p className="text-xs text-stone-500">Rekord: {data.longest} kun</p></div>
      <div className="text-right"><p className="flex items-center justify-end gap-1 text-xs font-bold text-violet-700"><Trophy className="h-4 w-4" /> {data.level}-daraja</p><p className="mt-1 text-xl font-black">{data.availableXp} XP</p><p className="text-[11px] text-stone-500">Jami topilgan: {data.totalXp} XP</p></div>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-violet-600" style={{ width: `${Math.min(100, data.levelProgress)}%` }} /></div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div className="rounded-2xl bg-white/70 p-3 dark:bg-stone-900/70"><Target className="mb-1 h-4 w-4 text-emerald-600" /><b>{data.weeklyPages}/{data.weeklyGoal}</b><p className="text-stone-500">Haftalik sahifa maqsadi</p></div><LinkBox /></div>
    <div className="mt-3 rounded-2xl border border-orange-200 bg-white/70 p-3 text-xs dark:bg-stone-900/70"><div className="flex flex-wrap items-center justify-between gap-2"><div><b>Streak himoyasi: {data.protectionsRemaining}/3 qoldi</b><p className="text-stone-500">Keyingi tiklash: {data.nextProtectionCost} XP</p></div>{data.canRestore&&<button type="button" disabled={restoring} onClick={restore} className="rounded-xl bg-orange-600 px-3 py-2 font-black text-white disabled:opacity-50">{restoring?'Tiklanmoqda…':`${data.restoreDate} kunini tiklash`}</button>}</div>{message&&<p className="mt-2 font-semibold text-orange-700">{message}</p>}</div>
    {data.achievements?.length > 0 && <div className="mt-4"><p className="mb-2 flex items-center gap-1 text-xs font-bold"><Award className="h-4 w-4" /> Nishonlar</p><div className="flex flex-wrap gap-2">{data.achievements.slice(0, 6).map((a: any) => <span key={a.achievement_key} className="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm dark:bg-stone-900">{BADGES[a.achievement_key]?.icon || '⭐'} {BADGES[a.achievement_key]?.label || a.achievement_key}</span>)}</div></div>}
  </section>;
}
function LinkBox() { return <a href="/qaydlar" className="rounded-2xl bg-white/70 p-3 hover:ring-2 hover:ring-amber-400 dark:bg-stone-900/70"><BookOpen className="mb-1 h-4 w-4 text-amber-600" /><b>Qaydlarim</b><p className="text-stone-500">Iqtibos va izohlar</p></a>; }
