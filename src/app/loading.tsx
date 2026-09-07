import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#FAF8F5]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-stone-200 bg-white px-7 py-6 shadow-xl">
        <Loader2 className="h-7 w-7 animate-spin text-amber-600" />
        <p className="text-sm font-bold text-stone-700">Sahifa yuklanmoqda…</p>
      </div>
    </div>
  );
}
