export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Sahifa yuklanmoqda" className="min-h-[55vh] animate-pulse space-y-7">
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-xl bg-stone-200/80" />
        <div className="h-4 w-full max-w-md rounded-lg bg-stone-100" />
      </div>
      <div className="h-24 rounded-3xl border border-stone-100 bg-white" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="space-y-2.5">
            <div className="aspect-[2/3] rounded-2xl bg-stone-200/70" />
            <div className="h-4 rounded-lg bg-stone-200/80" />
            <div className="h-3 w-2/3 rounded-lg bg-stone-100" />
          </div>
        ))}
      </div>
      <span className="sr-only">Sahifa yuklanmoqda…</span>
    </div>
  );
}
