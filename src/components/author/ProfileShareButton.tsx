'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export function ProfileShareButton({ authorName }: { authorName: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${authorName} — Manbora`, url: window.location.href });
        return;
      } catch {}
    }
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-xs font-black text-stone-700 transition-colors hover:bg-stone-50"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Share2 className="w-4 h-4" />}
      <span>{copied ? 'Havola nusxalandi' : 'Profilni ulashish'}</span>
    </button>
  );
}
