'use client';

import React, { useState } from 'react';
import { Share2, Send, MessageCircle, Copy, Check, X } from 'lucide-react';
import { getTelegramShareUrl, getWhatsappShareUrl } from '@/lib/utils/badges';

interface ShareButtonProps {
  title: string;
  url: string;
  description?: string;
}

export function ShareButton({ title, url, description }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = `Bog‘lanish katalogida ${title} rasmiy aloqa ma’lumotlari:${description ? ` ${description}` : ''}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
        return;
      } catch {
        // Fallback to menu if user cancelled or error
      }
    }
    setIsOpen(true);
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsOpen(false);
      }, 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={handleNativeShare}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-extrabold text-xs transition-colors min-h-[44px] active:scale-95 flex-shrink-0"
      >
        <Share2 className="w-4 h-4" />
        <span>Ulashish</span>
      </button>

      {/* Fallback Share Modal Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span>Ulashish</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              “{title}” aloqa ma’lumotlarini ijtimoiy tarmoqlar orqali yuboring:
            </p>

            <div className="space-y-2">
              <a
                href={getTelegramShareUrl(url, shareText)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-xs transition-colors"
              >
                <Send className="w-4 h-4 text-sky-600" />
                <span>Telegram orqali ulashish</span>
              </a>

              <a
                href={getWhatsappShareUrl(url, shareText)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp orqali ulashish</span>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-100 text-slate-800 hover:bg-slate-200 font-bold text-xs transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'Havola nusxalandi!' : 'Havolani nusxalash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
