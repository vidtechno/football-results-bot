'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ReportModal } from '@/components/directory/ReportModal';
import { trackEvent } from '@/lib/utils/analytics';

interface OrganizationDetailClientProps {
  organizationId: number;
  organizationName: string;
}

export function OrganizationDetailClient({
  organizationId,
  organizationName,
}: OrganizationDetailClientProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (organizationId) {
      trackEvent(organizationId, 'profile_open');
    }
  }, [organizationId]);

  return (
    <>
      <button
        onClick={() => setReportModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80 text-xs font-bold transition-colors active:scale-95 flex-shrink-0 min-h-[44px]"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span>Ma’lumot noto‘g‘ri?</span>
      </button>

      <ReportModal
        organizationId={organizationId}
        organizationName={organizationName}
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />
    </>
  );
}
