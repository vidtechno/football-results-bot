'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx('animate-pulse rounded-2xl bg-[#EAE5DD]/60', className)}
      {...props}
    />
  );
}

export function WorkCardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="aspect-2/3 w-full rounded-2xl bg-[#EAE5DD]/60 animate-pulse" />
      <div className="space-y-1.5 px-0.5">
        <div className="h-4 w-3/4 rounded-md bg-[#EAE5DD]/60 animate-pulse" />
        <div className="h-3 w-1/2 rounded-md bg-[#EAE5DD]/40 animate-pulse" />
      </div>
    </div>
  );
}

export function WorkGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <WorkCardSkeleton key={i} />
      ))}
    </div>
  );
}
