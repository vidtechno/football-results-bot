import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { NewOrganizationFormClient } from './client';
import { Building2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0;

export default async function NewOrganizationPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const [{ data: categories }, { data: regions }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('regions').select('*').order('sort_order', { ascending: true }),
  ]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        href="/diyoration/organizations"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Tashkilotlar reestriga qaytish</span>
      </Link>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-blue-600" />
          <span>Yangi Tashkilot Qo‘shish</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Yangi tashkilot yaratish uchun asosiy ma’lumotlarni kiriting
        </p>
      </div>

      <NewOrganizationFormClient categories={categories || []} regions={regions || []} />
    </div>
  );
}
