'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Check, Flag, PlusCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

export function AdminNotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all_read: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const markItemRead = async (id: number) => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        aria-label="Bildirishnomalar"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-white rounded-3xl p-4 border border-slate-200 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-600" />
              <strong className="text-xs font-black text-slate-900">Bildirishnomalar ({unreadCount})</strong>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>O‘qilgan deb belgilash</span>
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">Bildirishnomalar yo‘q</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link_url}
                  onClick={() => {
                    markItemRead(n.id);
                    setIsOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-xs block space-y-1 transition-all ${
                    n.is_read ? 'bg-slate-50 border-slate-200/60 text-slate-600' : 'bg-blue-50/70 border-blue-200 text-slate-900 font-bold'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 flex items-center gap-1.5">
                      {n.type === 'report' ? (
                        <Flag className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      {n.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{formatUzbekDate(n.created_at)}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium line-clamp-2">{n.summary}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
