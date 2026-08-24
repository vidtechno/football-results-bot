import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { EditOrganizationTabbedClient } from './client';
import { Building2, ArrowLeft, Eye } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditOrganizationPage({ params }: PageProps) {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const [
    { data: org },
    { data: categories },
    { data: regions },
    { data: auditLogs },
  ] = await Promise.all([
    supabase
      .from('organizations')
      .select(`
        *,
        category:categories(*),
        region:regions(*),
        contacts:organization_contacts(*),
        social_links:organization_social_links(*),
        locations:organization_locations(*),
        digital_services:organization_digital_services(*)
      `)
      .eq('id', params.id)
      .single(),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
    supabase.from('regions').select('*').order('sort_order', { ascending: true }),
    supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('target_type', 'organization')
      .eq('target_id', String(params.id))
      .order('created_at', { ascending: false }),
  ]);

  if (!org) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/diyoration/organizations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tashkilotlar reestriga qaytish</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            <span>{org.name}</span>
          </h1>
        </div>

        <Link
          href={`/organizations/${org.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors"
        >
          <Eye className="w-4 h-4" />
          <span>Ommaaviy profilni ko‘rish</span>
        </Link>
      </div>

      {/* Tabbed Client Editor Form */}
      <EditOrganizationTabbedClient
        organization={org}
        categories={categories || []}
        regions={regions || []}
        auditLogs={auditLogs || []}
      />
    </div>
  );
}
