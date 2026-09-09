import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-stone-200 bg-white px-7 py-6 shadow-xl">
        <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
        <p className="text-sm font-bold text-stone-700">Sahifa yuklanmoqda…</p>
      </div>
    </div>
  );
}
