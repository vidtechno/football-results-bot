import { Crown } from 'lucide-react';
import { clsx } from 'clsx';

export function PlusBadge({ className = '' }: { className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-1 text-[10px] font-black tracking-[0.12em] text-amber-900 shadow-sm', className)}>
      <Crown className="h-3 w-3" /> PLUS
    </span>
  );
}
