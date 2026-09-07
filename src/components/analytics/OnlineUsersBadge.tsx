'use client';

import { useEffect, useState } from 'react';

export function OnlineUsersBadge() {
  const [online, setOnline] = useState(0);
  useEffect(() => {
    const load = () => fetch('/api/analytics/online').then((r) => r.json()).then((d) => setOnline(Number(d.online || 0))).catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />{online} kishi onlayn</span>;
}
