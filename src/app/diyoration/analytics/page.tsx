import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { formatUzbekDate } from '@/lib/utils/formatters';
import {
  TrendingUp,
  Search,
  AlertCircle,
  PlusCircle,
  Building2,
  Calendar,
  AlertTriangle,
  FileQuestion,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Qidiruv va Directory Tahlillari | Admin | Manbora',
};

export const dynamic = 'force-dynamic';

interface AnalyticsPageProps {
  searchParams?: {
    days?: string;
  };
}

export default async function AdminAnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const daysParam = parseInt(searchParams?.days || '30', 10);
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;

  const supabase = createAdminClient();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // 1. Top searched & opened organizations from popularity events
  const { data: popularityEvents } = await supabase
    .from('organization_popularity_events')
    .select('organization_id, visitor_hash, event_type')
    .gte('created_at', startDate);

  const orgEventCounts = new Map<number, { count: number; uniqueVisitors: Set<string> }>();
  popularityEvents?.forEach((ev) => {
    if (!orgEventCounts.has(ev.organization_id)) {
      orgEventCounts.set(ev.organization_id, { count: 0, uniqueVisitors: new Set() });
    }
    const entry = orgEventCounts.get(ev.organization_id)!;
    entry.count += 1;
    if (ev.visitor_hash) entry.uniqueVisitors.add(ev.visitor_hash);
  });

  const sortedOrgIds = Array.from(orgEventCounts.entries())
    .map(([id, data]) => ({ id, count: data.count, uniqueCount: data.uniqueVisitors.size }))
    .sort((a, b) => b.uniqueCount - a.uniqueCount)
    .slice(0, 10);

  let topOrgsMap = new Map<number, string>();
  if (sortedOrgIds.length > 0) {
    const { data: orgNames } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', sortedOrgIds.map((o) => o.id));
    orgNames?.forEach((o) => topOrgsMap.set(o.id, o.name));
  }

  // 2. Top search terms & no-result terms from search_query_analytics
  const { data: searchLogs } = await supabase
    .from('search_query_analytics')
    .select('query_text, has_results, result_count')
    .gte('created_at', startDate);

  const termCounts = new Map<string, number>();
  const noResultCounts = new Map<string, number>();

  searchLogs?.forEach((log) => {
    const norm = log.query_text.trim().toLowerCase();
    if (norm) {
      termCounts.set(norm, (termCounts.get(norm) || 0) + 1);
      if (!log.has_results || log.result_count === 0) {
        noResultCounts.set(norm, (noResultCounts.get(norm) || 0) + 1);
      }
    }
  });

  const topTerms = Array.from(termCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topNoResults = Array.from(noResultCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // 3. New suggestions & contact reports count
  const [{ count: suggestionsCount }, { count: contactReportsCount }] = await Promise.all([
    supabase.from('organization_suggestions').select('id', { count: 'exact' }).gte('created_at', startDate),
    supabase.from('organization_reports').select('id', { count: 'exact' }).eq('report_type', 'contact_issue').gte('created_at', startDate),
  ]);

  // 4. Recently updated organizations
  const { data: recentOrgs } = await supabase
    .from('organizations')
    .select('id, name, slug, updated_at, status')
    .order('updated_at', { ascending: false })
    .limit(5);

  // 5. Overdue verifications (last_verified_at < 60 days ago or null)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const { data: overdueOrgs } = await supabase
    .from('organizations')
    .select('id, name, slug, last_verified_at')
    .eq('status', 'published')
    .or(`last_verified_at.is.null,last_verified_at.lt.${sixtyDaysAgo}`)
    .limit(5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-8">
      {/* Header & Time Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Qidiruv & Directory Tahlillari
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Foydalanuvchilar qidiruvlari, ko‘rishlari va moderatorlik statistikasi
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-auto">
          {[
            { label: '7 kun', val: 7 },
            { label: '30 kun', val: 30 },
            { label: '90 kun', val: 90 },
          ].map((item) => (
            <Link
              key={item.val}
              href={`/diyoration/analytics?days=${item.val}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                days === item.val
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Top Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Jami Qidiruvlar</span>
            <Search className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{searchLogs?.length || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">So‘nggi {days} kun ichida</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Natijasiz Qidiruvlar</span>
            <FileQuestion className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{topNoResults.length}</p>
          <span className="text-[11px] text-slate-400 font-medium">Topilmagan so‘rovlar turlari</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Yangi Takliflar</span>
            <PlusCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{suggestionsCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Taklif qilingan tashkilotlar</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Raqam Xatolari</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-600">{contactReportsCount || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Xabar qilingan buzilgan raqamlar</span>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Searched Organizations */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span>Eng Ko‘p Ko‘rilgan Tashkilotlar</span>
          </h2>

          {sortedOrgIds.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">Ma’lumot yig‘ilmagan</p>
          ) : (
            <div className="space-y-2.5">
              {sortedOrgIds.map((item, idx) => {
                const name = topOrgsMap.get(item.id) || `Tashkilot #${item.id}`;
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-black flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-extrabold text-slate-900 truncate">{name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <span className="font-bold text-slate-600">{item.uniqueCount} ta unikal tashrif</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Search Terms */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-sky-600" />
            <span>Eng Ommabop Qidiruv So‘rovlari</span>
          </h2>

          {topTerms.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">Qidiruvlar mavjud emas</p>
          ) : (
            <div className="space-y-2.5">
              {topTerms.map(([term, count], idx) => (
                <div
                  key={term}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-black flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-extrabold text-slate-900 truncate font-mono">“{term}”</span>
                  </div>
                  <span className="font-bold text-slate-600 flex-shrink-0">{count} marta</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Searches with No Result */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-amber-600" />
            <span>Natija Chiqmagan Qidiruvlar (Topilmadi)</span>
          </h2>

          {topNoResults.length === 0 ? (
            <p className="text-xs text-slate-400 italic p-4 text-center">Barcha qidiruvlarga natija topilgan</p>
          ) : (
            <div className="space-y-2.5">
              {topNoResults.map(([term, count]) => (
                <div
                  key={term}
                  className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-extrabold text-amber-950 truncate font-mono">“{term}”</span>
                  <span className="font-bold text-amber-800 flex-shrink-0">{count} marta topilmadi</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification Overdue Organizations */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <span>Tekshiruv Vaqti O‘tib Ketgan Tashkilotlar (60+ kun)</span>
          </h2>

          {!overdueOrgs || overdueOrgs.length === 0 ? (
            <p className="text-xs text-emerald-700 font-bold p-4 bg-emerald-50 rounded-2xl text-center">
              Barcha e’lon qilingan tashkilotlar o‘z vaqtida tekshirilgan!
            </p>
          ) : (
            <div className="space-y-2.5">
              {overdueOrgs.map((org) => (
                <div
                  key={org.id}
                  className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-extrabold text-slate-900 block truncate">{org.name}</span>
                    <span className="text-[11px] text-rose-700 font-semibold">
                      {org.last_verified_at ? formatUzbekDate(org.last_verified_at) : 'Hech qachon tekshirilmagan'}
                    </span>
                  </div>
                  <Link
                    href={`/diyoration/organizations/${org.id}`}
                    className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs shadow-2xs"
                  >
                    Tekshirish
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
