'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check, ExternalLink, Loader2, Sparkles, BookOpen, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatUzbekDate } from '@/lib/utils/formatters';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message?: string;
  summary?: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ isMobile = false }: { isMobile?: boolean }) {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const endpoint = isAdmin ? '/api/admin/notifications' : '/api/notifications';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setNotifications((data.notifications || []).slice(0, 5));
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // Ignore background network failure
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // 1 minute polling
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside listener to close dropdown
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

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    setLoading(true);
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        className={clsx(
          'relative p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EC] transition-colors shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center',
          isOpen && 'bg-[#F5F2EC] text-[#1C1917]',
        )}
        aria-label={`Bildirishnomalar (${unreadCount} ta o‘qilmagan)`}
        title="Bildirishnomalar"
      >
        <Bell className={clsx(isMobile ? 'w-4.5 h-4.5' : 'w-4 h-4')} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[9px] font-black text-white shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div
          className={clsx(
            'absolute right-0 mt-2 bg-white rounded-2xl border border-[#EAE5DD] shadow-xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150',
            isMobile ? 'w-80 max-w-[90vw]' : 'w-88',
          )}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-[#F5F2EC] bg-[#FAF8F5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#1C1917]">
                Bildirishnomalar
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
                  {unreadCount} yangi
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={loading}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-900 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                <span>O‘qildi deb belgilash</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-[#F5F2EC] text-xs">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-[#A8A29E] font-medium text-xs">
                Hozircha yangi bildirishnomalar yo‘q
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.is_read;
                const link = item.link_url || '/bildirishnomalar';

                return (
                  <Link
                    key={item.id}
                    href={link}
                    onClick={() => setIsOpen(false)}
                    className={clsx(
                      'p-3 block transition-colors hover:bg-[#F9F7F4]',
                      isUnread && 'bg-amber-50/40',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-[#1C1917] text-xs line-clamp-1">
                        {item.title}
                      </p>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-0.5 line-clamp-2">
                      {item.message || item.summary || ''}
                    </p>
                    <span className="text-[10px] text-[#A8A29E] block mt-1">
                      {formatUzbekDate(item.created_at)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-[#F5F2EC] bg-[#FAF8F5] text-center">
            <Link
              href="/bildirishnomalar"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors inline-flex items-center gap-1"
            >
              <span>Barcha bildirishnomalarni ko‘rish</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
