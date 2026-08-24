'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export function CopyButton({ textToCopy, label = 'Nusxalash', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for non-HTTPS or older browsers
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${label}: ${textToCopy}`}
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95',
        copied
          ? 'bg-emerald-500 text-white shadow-sm'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80',
        className,
      )}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
      <span>{copied ? 'Nusxalandi' : label}</span>
    </button>
  );
}
