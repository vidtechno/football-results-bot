import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/admin/StatCard';
import { OrganizationAvatar } from '@/components/ui/OrganizationAvatar';
import { formatUzbekDate } from '@/lib/utils/formatters';
import {
  Building2,
  CheckCircle2,
  Phone,
  Smartphone,
  Flag,
  Calendar,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Landmark,
  Zap,
} from 'lucide-react';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/diyoration');
  }

  const supabase = createAdminClient();

  // Fetch Real Database Statistics in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalOrgs },
    { count: verifiedOrgs },
    { count: pendingOrgs },
    { count: totalContacts },
    { count: totalDigitalServices },
    { count: totalReports },
    { count: pendingReports },
    { count: added7Days },
    { count: added30Days },
    { data: recentOrgs },
    { data: recentReports },
    { data: categories },
  ] = await Promise.all([
    supabase.from('organizations').select('id', { count: 'exact' }),
    supabase.from('organizations').select('id', { count: 'exact' }).eq('verification_status', 'verified'),
    supabase.from('organizations').select('id', { count: 'exact' }).neq('verification_status', 'verified'),
    supabase.from('organization_contacts').select('id', { count: 'exact' }),
    supabase.from('organization_digital_services').select('id', { count: 'exact' }),
    supabase.from('organization_reports').select('id', { count: 'exact' }),
    supabase.from('organization_reports').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabase.from('organizations').select('id', { count: 'exact' }).gte('created_at', sevenDaysAgo),
    supabase.from('organizations').select('id', { count: 'exact' }).gte('created_at', thirtyDaysAgo),
    supabase.from('organizations').select('*, category:categories(*), region:regions(*)').order('updated_at', { ascending: false }).limit(6),
    supabase.from('organization_reports').select('*, organization:organizations(name, slug)').order('created_at', { ascending: false }).limit(5),
    supabase.from('categories').select('*').order('sort_order', { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-blue-600 fill-blue-600" />
            <span>Admin Boshqaruv Paneli</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Xush kelibsiz, <strong>{session.username}</strong>! Milliy raqamli xizmatlar va tashkilotlar nazorati.
          </p>
        </div>

        <Link
          href="/diyoration/organizations/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md shadow-blue-600/30 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi tashkilot qo‘shish</span>
        </Link>
      </div>

      {/* Grid of Real Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jami Tashkilotlar"
          value={totalOrgs || 0}
          icon={Building2}
          color="blue"
          description={`Oxirgi 7 kunda: +${added7Days || 0} ta | 30 kunda: +${added30Days || 0} ta`}
        />
        <StatCard
          title="Tasdiqlanganlar"
          value={verifiedOrgs || 0}
          icon={CheckCircle2}
          color="emerald"
          description="Rasmiy manbasi mavjud verifikatsiyalangan"
        />
        <StatCard
          title="Raqamli Ilovalar & Portallar"
          value={totalDigitalServices || 0}
          icon={Smartphone}
          color="purple"
          description="Rasmiy veb-saytlar, mobil ilovalar va botlar"
        />
        <StatCard
          title="Ko‘rib Chiqilayotgan Xabarlar"
          value={pendingReports || 0}
          icon={Flag}
          color={pendingReports ? 'rose' : 'emerald'}
          description={`Jami yuborilgan xabarlar: ${totalReports || 0} ta`}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">Jami Aloqa Raqamlari</span>
            <strong className="text-xl font-black text-slate-900">{totalContacts || 0} ta</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">Kategoriyalar Soni</span>
            <strong className="text-xl font-black text-slate-900">{categories?.length || 0} ta</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">Kutilayotgan Tekshiruvlar</span>
            <strong className="text-xl font-black text-slate-900">{pendingOrgs || 0} ta</strong>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Recent Orgs & Moderation Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Organization Updates (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Oxirgi yangilangan tashkilotlar</span>
            </h2>
            <Link
              href="/diyoration/organizations"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Barchasini ko‘rish</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrgs?.map((org: any) => (
              <div key={org.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <OrganizationAvatar
                    name={org.name}
                    logoUrl={org.logo_url}
                    type={org.organization_type}
                    categorySlug={org.category?.slug}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/diyoration/organizations/${org.id}`}
                      className="font-extrabold text-slate-900 text-sm hover:text-blue-600 transition-colors truncate block"
                    >
                      {org.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      <span>{org.category?.name || 'Kategoriyasiz'}</span>
                      <span>• {org.region?.name || 'Tashkent'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      org.status === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {org.status === 'published' ? 'Chop etilgan' : 'Qoralama'}
                  </span>
                  <Link
                    href={`/diyoration/organizations/${org.id}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition-colors"
                  >
                    Tahrirlash
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Moderation Reports (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Flag className="w-5 h-5 text-rose-600" />
              <span>Foydalanuvchi xabarlari</span>
            </h2>
            <Link
              href="/diyoration/reports"
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Moderatsiya</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {!recentReports || recentReports.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-4">Kutilayotgan xabarnomalar yo‘q</p>
          ) : (
            <div className="space-y-3">
              {recentReports.map((report: any) => (
                <div key={report.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-900 truncate font-extrabold">{report.organization?.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded border ${
                        report.status === 'pending'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {report.status === 'pending' ? 'Yangi' : 'Hal qilingan'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-snug">{report.message}</p>
                  <span className="text-[10px] text-slate-400 block pt-1">{formatUzbekDate(report.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
