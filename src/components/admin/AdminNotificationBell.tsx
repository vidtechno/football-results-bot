'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, Flag, PlusCircle, ExternalLink, Loader2 } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { useNotifications } from '@/components/providers/NotificationProvider';

export function AdminNotificationBell() {
  const { notifications, unreadCount, loading, markAllAsRead, markItemAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center min-h-[36px] min-w-[36px]"
        aria-label={`Bildirishnomalar (${unreadCount} ta o‘qilmagan)`}
        title="Bildirishnomalar"
      >
        <Bell className="w-4.5 h-4.5 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center border-2 border-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-3xl p-4 border border-slate-200 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <strong className="text-xs font-black text-slate-900">
                Bildirishnomalar {unreadCount > 0 ? `(${unreadCount})` : ''}
              </strong>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                disabled={loading}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>O‘qilgan deb belgilash</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">Bildirishnomalar yo‘q</p>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.is_read;
                const link = n.link_url || '/diyoration/dashboard';

                return (
                  <Link
                    key={n.id}
                    href={link}
                    onClick={() => {
                      if (isUnread) markItemAsRead(n.id);
                      setIsOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-xs block space-y-1 transition-all ${
                      isUnread
                        ? 'bg-blue-50/70 border-blue-200 text-slate-900 font-bold'
                        : 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900 flex items-center gap-1.5 truncate">
                        {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0">
                        {formatUzbekDate(n.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 font-medium line-clamp-2">
                      {n.body || n.message || n.summary || ''}
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
