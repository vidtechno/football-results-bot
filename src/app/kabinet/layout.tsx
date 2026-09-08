import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function KabinetLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
