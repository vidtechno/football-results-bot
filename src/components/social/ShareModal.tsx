'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Share2, X, Copy, Check, Send, Facebook, Instagram } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url?: string;
  authorName?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  title,
  url,
  authorName,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = authorName
    ? `«${title}» — ${authorName}. Manbora platformasida o‘qing:`
    : `«${title}» asarini Manbora platformasida o‘qing:`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleTelegramShare = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, '_blank');
  };

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(fbUrl, '_blank');
  };

  const handleCopyInstagramCaption = async () => {
    const caption = `${shareText}\n${shareUrl}\n\n#Manbora #UzbekAdabiyoti #Kitoblar #YangiAsar #Mutolaa`;
    try {
      await navigator.clipboard.writeText(caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title,
          text: shareText,
          url: shareUrl,
        });
        onClose();
      } catch {
        // User cancelled or not supported
      }
    }
  };

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-base">
            <Share2 className="w-5 h-5 text-amber-600" />
            <span>Asarni ulashish</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="font-bold text-stone-900 text-sm truncate">{title}</h4>
          {authorName && <p className="text-xs text-stone-500 truncate">{authorName}</p>}
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {typeof navigator !== 'undefined' && (navigator as any).share && (
            <button
              onClick={handleNativeShare}
              className="col-span-2 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Tezkor ulashish (Telefon)</span>
            </button>
          )}

          <button
            onClick={handleTelegramShare}
            className="py-2.5 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4 text-sky-600" />
            <span>Telegram</span>
          </button>

          <button
            onClick={handleFacebookShare}
            className="py-2.5 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Facebook className="w-4 h-4 text-blue-600" />
            <span>Facebook</span>
          </button>
        </div>

        {/* Copy Link Input */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="text-[11px] font-bold text-stone-500">Havolani nusxalash:</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-stone-200 text-xs text-stone-600 font-mono select-all outline-hidden"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Nusxalandi' : 'Nusxa'}</span>
            </button>
          </div>
        </div>

        {/* Instagram Post Caption Copy */}
        <button
          onClick={handleCopyInstagramCaption}
          className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
        >
          <Instagram className="w-4 h-4 text-purple-600" />
          <span>{copiedCaption ? 'Instagram izohi nusxalandi!' : 'Instagram izohini nusxalash'}</span>
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
