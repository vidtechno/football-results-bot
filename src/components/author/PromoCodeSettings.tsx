'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgePercent, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

type Promo = { id:string; code:string; discount_type:'percent'|'fixed'; discount_value:number; max_uses:number|null; used_count:number; expires_at:string|null; is_active:boolean; work?:{title?:string}|null };

export function PromoCodeSettings({ works }: { works: Array<{ id: string; title: string }> }) {
  const [open,setOpen]=useState(false); const [codes,setCodes]=useState<Promo[]>([]); const [code,setCode]=useState('');
  const [type,setType]=useState<'percent'|'fixed'>('percent'); const [value,setValue]=useState('10'); const [workId,setWorkId]=useState('');
  const [maxUses,setMaxUses]=useState(''); const [expiresAt,setExpiresAt]=useState(''); const [message,setMessage]=useState(''); const [loading,setLoading]=useState(false);
  const authHeaders=useCallback(async():Promise<Record<string,string>>=>{const{data}=await supabase.auth.getSession();return data.session?{Authorization:`Bearer ${data.session.access_token}`}:{}} ,[]);
  const loadCodes=useCallback(async()=>{const headers=await authHeaders();const response=await fetch('/api/author/promo-codes',{headers});const data=await response.json();if(response.ok)setCodes(data.codes||[]);},[authHeaders]);
  useEffect(()=>{if(open)void loadCodes();},[open,loadCodes]);

  async function createCode(){setLoading(true);setMessage('');const headers=await authHeaders();const response=await fetch('/api/author/promo-codes',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify({code,discountType:type,discountValue:Number(value),workId:workId||null,maxUses:maxUses?Number(maxUses):null,expiresAt:expiresAt?new Date(expiresAt).toISOString():null})});const data=await response.json();setMessage(response.ok?`${data.code.code} promo-kodi yaratildi`:data.error||'Promo-kod yaratilmadi');if(response.ok){setCode('');await loadCodes();}setLoading(false);}
  async function deactivate(id:string){const headers=await authHeaders();const response=await fetch(`/api/author/promo-codes?id=${encodeURIComponent(id)}`,{method:'DELETE',headers});if(response.ok)await loadCodes();}

  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
    <button type="button" onClick={()=>setOpen(v=>!v)} className="flex w-full items-center justify-between"><span className="flex items-center gap-2 font-black text-emerald-900"><BadgePercent className="h-5 w-5"/> Promo-kod va chegirmalar</span><span className="text-xs font-bold text-emerald-700">{open?'Yopish':'Boshqarish'}</span></button>
    {open&&<div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-bold text-emerald-950">Promo-kod<input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g,''))} maxLength={40} placeholder="MASALAN10" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
        <label className="text-xs font-bold text-emerald-950">Chegirma turi<select value={type} onChange={e=>setType(e.target.value as 'percent'|'fixed')} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"><option value="percent">Foiz</option><option value="fixed">Aniq summa</option></select></label>
        <label className="text-xs font-bold text-emerald-950">{type==='percent'?'Foiz (1–90)':'Summa (so‘m)'}<input type="number" min="1" max={type==='percent'?90:undefined} value={value} onChange={e=>setValue(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
        <label className="text-xs font-bold text-emerald-950">Asar<select value={workId} onChange={e=>setWorkId(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"><option value="">Barcha asarlar</option>{works.map(w=><option key={w.id} value={w.id}>{w.title}</option>)}</select></label>
        <label className="text-xs font-bold text-emerald-950">Foydalanish limiti<input type="number" min="1" value={maxUses} onChange={e=>setMaxUses(e.target.value)} placeholder="Cheklanmagan" className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
        <label className="text-xs font-bold text-emerald-950">Amal qilish muddati<input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5"/></label>
      </div>
      <button type="button" onClick={createCode} disabled={loading||code.length<3||Number(value)<=0} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-xs font-bold text-white disabled:opacity-50">{loading?<Loader2 className="h-4 w-4 animate-spin"/>:<Plus className="h-4 w-4"/>} Yaratish</button>
      {message&&<p className="text-xs font-semibold text-emerald-900">{message}</p>}
      <div className="space-y-2 border-t border-emerald-200 pt-4">{codes.length===0?<p className="text-xs text-emerald-700">Hozircha promo-kod yaratilmagan.</p>:codes.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white p-3 text-xs"><div><strong className="text-sm text-emerald-950">{p.code}</strong><p className="text-emerald-700">{p.discount_type==='percent'?`${p.discount_value}%`:`${Number(p.discount_value).toLocaleString('uz-UZ')} so‘m`} · {p.work?.title||'Barcha asarlar'} · {p.used_count}/{p.max_uses??'∞'} ishlatilgan{p.expires_at?` · ${new Date(p.expires_at).toLocaleDateString('uz-UZ')} gacha`:''}</p></div>{p.is_active&&<button type="button" onClick={()=>deactivate(p.id)} className="flex min-h-10 items-center gap-1 rounded-xl border border-rose-200 px-3 font-bold text-rose-700"><Trash2 className="h-4 w-4"/> O‘chirish</button>}</div>)}</div>
    </div>}
  </section>;
}
