'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  read_at?: string | null;
  created_at: string;
}

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markItemAsRead: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  refreshNotifications: async () => {},
  markAllAsRead: async () => {},
  markItemAsRead: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const activeUserIdRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
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
        // Guard against race conditions if user logged out while request was in-flight
        if (activeUserIdRef.current === user.id) {
          setNotifications(data.notifications || []);
          setUnreadCount(Number(data.unread_count || 0));
          setError(null);
        }
      } else {
        if (activeUserIdRef.current === user.id) {
          setError('Bildirishnomalarni yuklab bo‘lmadi');
        }
      }
    } catch {
      if (activeUserIdRef.current === user.id) {
        setError('Tarmoq xatosi');
      }
    }
  }, [user]);

  // Sync on user change or logout
  useEffect(() => {
    activeUserIdRef.current = user?.id || null;

    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
    } else {
      let cancelled = false;
      const run = () => {
        if (!cancelled) {
          fetchNotifications();
        }
      };

      let idleHandle: any;
      let timerHandle: any;
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleHandle = (window as any).requestIdleCallback(run, { timeout: 1500 });
      } else {
        timerHandle = setTimeout(run, 300);
      }

      return () => {
        cancelled = true;
        if (idleHandle && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(idleHandle);
        }
        if (timerHandle) clearTimeout(timerHandle);
      };
    }
  }, [user, fetchNotifications]);

  // Periodic fallback polling every 45 seconds if user is logged in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Realtime Supabase postgres_changes subscription (zero memory leak, safe cleanup)
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `realtime_notifications_${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'in_site_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

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

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('manbora:notifications_changed'));
      }
    } catch {
      // Rollback on network failure
      fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  const markItemAsRead = async (id: string) => {
    if (!user) return;
    const item = notifications.find((notification) => notification.id === id);
    if (!item || item.is_read || item.read_at) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

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
        body: JSON.stringify({ action: 'mark_read', id }),
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('manbora:notifications_changed'));
      }
    } catch {
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications: fetchNotifications,
        markAllAsRead,
        markItemAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
