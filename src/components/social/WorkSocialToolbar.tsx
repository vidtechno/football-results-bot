'use client';

import React, { useState } from 'react';
import { Share2, Flag } from 'lucide-react';
import { FollowButton } from '@/components/social/FollowButton';
import { ShareModal } from '@/components/social/ShareModal';
import { ReportModal } from '@/components/report/ReportModal';

interface WorkSocialToolbarProps {
  workId: string;
  workTitle: string;
  authorName?: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
}

export function WorkSocialToolbar({
  workId,
  workTitle,
  authorName,
  initialIsFollowing = false,
  initialFollowerCount = 0,
}: WorkSocialToolbarProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <FollowButton
          type="work"
          targetId={workId}
          initialIsFollowing={initialIsFollowing}
          initialFollowerCount={initialFollowerCount}
        />

        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          className="px-4 py-2 rounded-2xl bg-white border border-stone-200 hover:border-amber-400 text-stone-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-2xs"
          title="Ulashish"
        >
          <Share2 className="w-4 h-4 text-stone-500" />
          <span>Ulashish</span>
        </button>

        <button
          type="button"
          onClick={() => setIsReportOpen(true)}
          className="p-2.5 rounded-2xl bg-white border border-stone-200 hover:border-rose-400 text-stone-400 hover:text-rose-600 transition-colors shadow-2xs"
          title="Shikoyat qilish"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title={workTitle}
        authorName={authorName}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="work"
        targetId={workId}
        targetTitle={workTitle}
      />
    </>
  );
}
