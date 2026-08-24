'use client';

import React, { useState } from 'react';
import { AlertTriangle, Share2 } from 'lucide-react';
import { ReportModal } from '@/components/directory/ReportModal';

interface OrganizationDetailClientProps {
  organizationId: number;
  organizationName: string;
}

export function OrganizationDetailClient({
  organizationId,
  organizationName,
}: OrganizationDetailClientProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Nusxalandi!' : 'Ulasish'}</span>
        </button>

        <button
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Ma’lumot noto‘g‘ri?</span>
        </button>
      </div>

      <ReportModal
        organizationId={organizationId}
        organizationName={organizationName}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
