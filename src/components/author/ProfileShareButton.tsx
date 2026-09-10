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
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-bold text-xs min-h-[44px]"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Share2 className="w-4 h-4" />}
      <span>{copied ? 'Havola nusxalandi' : 'Profilni ulashish'}</span>
    </button>
  );
}
