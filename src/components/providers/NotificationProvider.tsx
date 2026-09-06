'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  summary?: string;
  link_url?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshNotifications: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/notifications', {
        headers,
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications((data.notifications || []).slice(0, 10));
        setUnreadCount(Number(data.unread_count || 0));
      }
    } catch {
      // background network error
    }
  }, [user]);

  // Sync on user change or mount
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
    } else {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  // Periodic polling every 30 seconds if user is logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Global event listener for immediate sync across components
  useEffect(() => {
    const handleSync = () => {
      fetchNotifications();
    };

    window.addEventListener('manbora:notifications_changed', handleSync);
    return () => {
      window.removeEventListener('manbora:notifications_changed', handleSync);
    };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    setLoading(true);

    // Optimistic update
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      await fetch('/api/notifications', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'mark_all_read' }),
      });

      // Notify any other listening components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('manbora:notifications_changed'));
      }
    } catch {
      // If error, rollback by re-fetching
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications: fetchNotifications,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
