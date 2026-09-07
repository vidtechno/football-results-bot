'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '@/components/providers/NotificationProvider';

export function NotificationsReadStatus() {
  const { unreadCount, markAllAsRead } = useNotifications();
  const markedRef = useRef(false);

  useEffect(() => {
    if (!markedRef.current && unreadCount > 0) {
      markedRef.current = true;
      void markAllAsRead();
    }
  }, [markAllAsRead, unreadCount]);

  return (
    <p className="text-xs sm:text-sm text-[#78716C] font-medium" aria-live="polite">
      {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan xabar` : 'Barcha xabarlar o‘qilgan'}
    </p>
  );
}
