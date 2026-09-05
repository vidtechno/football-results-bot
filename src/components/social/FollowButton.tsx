'use client';

import React, { useState, useTransition } from 'react';
import { Bookmark, BookmarkCheck, Heart, UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  type: 'work' | 'author';
  targetId: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  variant?: 'default' | 'compact' | 'pill';
  showCount?: boolean;
}

export function FollowButton({
  type,
  targetId,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  variant = 'default',
  showCount = true,
}: FollowButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push(`/kirish?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Optimistic update
    const nextFollowing = !isFollowing;
    const nextCount = Math.max(0, followerCount + (nextFollowing ? 1 : -1));
    setIsFollowing(nextFollowing);
    setFollowerCount(nextCount);

    startTransition(async () => {
      try {
        const res = await fetch('/api/social/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, targetId }),
        });
        const data = await res.json();
        if (data.success) {
          setIsFollowing(data.isFollowing);
          setFollowerCount(data.followerCount);
        } else {
          // Revert
          setIsFollowing(!nextFollowing);
          setFollowerCount(followerCount);
        }
      } catch (err) {
        setIsFollowing(!nextFollowing);
        setFollowerCount(followerCount);
      }
    });
  };

  if (variant === 'compact') {
    return (
      <button
        onClick={handleToggle}
        disabled={isPending}
        title={isFollowing ? 'Kuzatuvni bekor qilish' : 'Kuzatish'}
        className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold ${
          isFollowing
            ? 'bg-amber-100/70 border-amber-300 text-amber-900 shadow-2xs'
            : 'bg-white border-[#EAE5DD] text-stone-700 hover:border-amber-400 hover:text-amber-800'
        }`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
        ) : type === 'work' ? (
          isFollowing ? <BookmarkCheck className="w-4 h-4 text-amber-700" /> : <Bookmark className="w-4 h-4" />
        ) : (
          isFollowing ? <UserCheck className="w-4 h-4 text-amber-700" /> : <UserPlus className="w-4 h-4" />
        )}
        {showCount && followerCount > 0 && <span>{followerCount}</span>}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-4 py-2 rounded-2xl border font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-2xs ${
        isFollowing
          ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
          : 'bg-white text-stone-800 border-[#EAE5DD] hover:border-amber-500 hover:text-amber-700'
      }`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : type === 'work' ? (
        isFollowing ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />
      ) : (
        isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
      )}

      <span>
        {type === 'work'
          ? isFollowing
            ? 'Kuzatilmoqda'
            : 'Asarni kuzatish'
          : isFollowing
          ? 'Kuzatilmoqda'
          : 'Muallifni kuzatish'}
      </span>

      {showCount && (
        <span
          className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
            isFollowing ? 'bg-amber-700 text-white' : 'bg-[#FAF8F5] text-stone-600 border border-[#EAE5DD]'
          }`}
        >
          {followerCount}
        </span>
      )}
    </button>
  );
}
