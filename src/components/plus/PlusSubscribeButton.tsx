'use client';
import { useEffect, useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';

export function PlusSubscribeButton() {
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void fetch('/api/plus/subscribe').then((r) => r.json()).then(setState); }, []);
  async function subscribe() {
    setBusy(true); setError('');
    const response = await fetch('/api/plus/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotencyKey: `plus_${Date.now()}_${crypto.randomUUID()}` }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error || 'Obuna faollashmadi');
    window.location.reload();
  }
  if (state?.active) return <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-950">Plus faol · {new Date(state.subscription.expires_at).toLocaleDateString('uz-UZ')} gacha</div>;
  return <div className="space-y-2"><button onClick={subscribe} disabled={busy} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-500 px-6 font-black text-stone-950 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} 30 kunga ulanish · {formatUZS(state?.price || 30000)}</button>{error && <p className="text-sm font-bold text-rose-700">{error}</p>}</div>;
}
