import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { OrganizationsTableClient } from './client';
import { Building2, Plus, Search, Filter } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: {
    q?: string;
    category?: string;
    region?: string;
    type?: string;
    status?: string;
  };
}

export default async function AdminOrganizationsPage({ searchParams }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const [
    { data: organizations },
    { data: categories },
    { data: regions },
  ] = await Promise.all([
    supabase.from('organizations').select('*, category:categories(*), region:regions(*), contacts:organization_contacts(*)').order('id', { ascending: false }),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('regions').select('*').order('sort_order', { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            <span>Tashkilotlar Reestri Boshqaruvi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Mavjud tashkilotlarni qidirish, tahrirlash, chop etish va boshqarish
          </p>
        </div>

        <Link
          href="/diyoration/organizations/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi tashkilot yaratish</span>
        </Link>
      </div>

      {/* Interactive Client Data Table */}
      <OrganizationsTableClient
        initialOrganizations={organizations || []}
        categories={categories || []}
        regions={regions || []}
      />
    </div>
  );
}
