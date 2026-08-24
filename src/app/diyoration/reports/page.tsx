import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { ReportsModerationClient } from './client';
import { Flag } from 'lucide-react';

export const revalidate = 0;

export default async function AdminReportsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: reports } = await supabase
    .from('organization_reports')
    .select('*, organization:organizations(id, name, slug, logo_url, category:categories(name))')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Flag className="w-7 h-7 text-rose-600" />
          <span>Foydalanuvchilar Xabarnomalari Moderatsiyasi</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Foydalanuvchilar tomonidan yuborilgan ma’lumot tuzatish xabarlarini ko‘rib chiqish va holatini yangilash
        </p>
      </div>

      <ReportsModerationClient initialReports={reports || []} />
    </div>
  );
}
