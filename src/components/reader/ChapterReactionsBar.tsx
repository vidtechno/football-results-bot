'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Hourglass, Sparkles, Frown, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { ChapterReactionType } from '@/lib/types/platform';

interface ChapterReactionsBarProps {
  chapterId: string;
  workId: string;
  canonicalUrl?: string;
}

const REACTION_CONFIG: Array<{
  type: ChapterReactionType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeColor: string;
  emoji: string;
}> = [
  {
    type: 'next_chapter',
    label: 'Keyingi bobni kutyapman',
    icon: Hourglass,
    activeColor: 'bg-amber-100 text-amber-900 border-amber-400 ring-1 ring-amber-300',
    emoji: '⏳',
  },
  {
    type: 'like',
    label: 'Yoqdi',
    icon: Heart,
    activeColor: 'bg-rose-100 text-rose-900 border-rose-400 ring-1 ring-rose-300',
    emoji: '❤️',
  },
  {
    type: 'surprised',
    label: 'Hayron qoldirdi',
    icon: Sparkles,
    activeColor: 'bg-purple-100 text-purple-900 border-purple-400 ring-1 ring-purple-300',
    emoji: '😮',
  },
  {
    type: 'sad',
    label: 'Xafa qildi',
    icon: Frown,
    activeColor: 'bg-blue-100 text-blue-900 border-blue-400 ring-1 ring-blue-300',
    emoji: '😢',
  },
];

export function ChapterReactionsBar({ chapterId, workId, canonicalUrl }: ChapterReactionsBarProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [counts, setCounts] = useState<Record<ChapterReactionType, number>>({
    next_chapter: 0,
    like: 0,
    surprised: 0,
    sad: 0,
  });
  const [userReaction, setUserReaction] = useState<ChapterReactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadReactions() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(`/api/chapters/reactions?chapterId=${chapterId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setCounts(data.counts || { next_chapter: 0, like: 0, surprised: 0, sad: 0 });
            setUserReaction(data.userReaction || null);
          }
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReactions();
    return () => {
      isMounted = false;
    };
  }, [chapterId, user]);

  const handleToggleReaction = async (type: ChapterReactionType) => {
    if (!user) {
      const returnDestination =
        typeof window !== 'undefined'
          ? window.location.pathname + window.location.search
          : canonicalUrl || '/';
      router.push(`/kirish?returnUrl=${encodeURIComponent(returnDestination)}`);
      return;
    }

    if (pending) return;

    // Optimistic calculation
    const previousReaction = userReaction;
    const previousCounts = { ...counts };

    const newCounts = { ...counts };
    let newReaction: ChapterReactionType | null = null;

    if (previousReaction === type) {
      // Toggle off
      newCounts[type] = Math.max(0, newCounts[type] - 1);
      newReaction = null;
    } else {
      // Switch or set
      if (previousReaction) {
        newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
      }
      newCounts[type] = (newCounts[type] || 0) + 1;
      newReaction = type;
    }

    setUserReaction(newReaction);
    setCounts(newCounts);

    try {
      setPending(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/chapters/reactions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          chapterId,
          workId,
          reactionType: type,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Revert on error
        setUserReaction(previousReaction);
        setCounts(previousCounts);
      } else {
        setUserReaction(data.userReaction);
        setCounts(data.counts);
      }
    } catch {
      // Revert on network exception
      setUserReaction(previousReaction);
      setCounts(previousCounts);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="py-6 border-y border-stone-200/80 space-y-3 max-w-2xl mx-auto">
      <div className="flex items-center justify-between text-xs font-bold text-stone-600">
        <span>Bob sizga qanday taassurot qoldirdi?</span>
        <span className="text-[11px] text-stone-400 font-medium">Reaksiyangizni bildiring</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {REACTION_CONFIG.map((r) => {
          const Icon = r.icon;
          const isActive = userReaction === r.type;
          const count = counts[r.type] || 0;

          return (
            <button
              key={r.type}
              type="button"
              onClick={() => handleToggleReaction(r.type)}
              title={r.label}
              className={`p-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 min-h-[56px] select-none text-center ${
                isActive
                  ? r.activeColor
                  : 'bg-white border-stone-200/80 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{r.emoji}</span>
                <span className="text-xs font-black">{count}</span>
              </div>
              <span className="text-[10px] font-bold text-stone-600 leading-tight">
                {r.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
