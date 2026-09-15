'use client';
import { useEffect, useRef, useState } from 'react';
import { Crown, Loader2 } from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { DEFAULT_PLUS_MONTHLY_PRICE } from '@/lib/plus/config';

export function PlusSubscribeButton() {
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const purchaseKey = useRef('');
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/plus/subscribe', { signal: controller.signal, cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('Plus ma’lumotlari olinmadi');
        return r.json();
      })
      .then(setState)
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Plus holatini tekshirib bo‘lmadi. Sahifani yangilang.');
      });
    return () => controller.abort();
  }, []);
  async function subscribe() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      // Reuse the same key after an uncertain network response to avoid a second debit.
      purchaseKey.current ||= `plus_${Date.now()}_${crypto.randomUUID()}`;
      const response = await fetch('/api/plus/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: purchaseKey.current }),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error || 'Obuna faollashmadi');
      window.location.reload();
    } catch {
      setError('So‘rov bajarilmadi. Internet aloqasini tekshirib, qayta urinib ko‘ring.');
    } finally {
      setBusy(false);
    }
  }
  if (state?.active)
    return (
      <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-950">
        Plus faol · {new Date(state.subscription.expires_at).toLocaleDateString('uz-UZ')} gacha
      </div>
    );
  return (
    <div className="space-y-2">
      <button
        onClick={subscribe}
        disabled={busy}
        className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-amber-500 px-6 font-black text-stone-950 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />} 30
        kunga ulanish · {formatUZS(state?.price || DEFAULT_PLUS_MONTHLY_PRICE)}
      </button>
      {error && <p className="text-sm font-bold text-rose-700">{error}</p>}
    </div>
  );
}
