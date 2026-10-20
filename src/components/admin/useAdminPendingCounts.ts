'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { AdminBadgeKey } from './adminNav';

type Counts = Partial<Record<AdminBadgeKey, number>>;

/** Sahifa almashganda kutilayotgan ishlar sonini yangilaydi (interval yo'q, bazani yuklamaydi). */
export function useAdminPendingCounts(): Counts {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/pending-counts', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) setCounts(data.counts || {});
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return counts;
}
