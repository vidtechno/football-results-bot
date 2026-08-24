import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Settings, ShieldCheck, History, Terminal } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: auditLogs } = await supabase
    .from('admin_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-700" />
          <span>Tizim Sozlamalari & Audit Loglari</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Faol seans ma’lumotlari va barcha admin amallari audit yozuvlari
        </p>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Faol Seans Holati</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-bold block">Foydalanuvchi</span>
            <strong className="text-sm font-black text-slate-900">{session.username}</strong>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-bold block">Roli</span>
            <strong className="text-sm font-black text-emerald-700 uppercase">{session.role}</strong>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-slate-500 font-bold block">Seans Amal Qilish Muddati</span>
            <strong className="text-sm font-black text-slate-900">{formatUzbekDate(new Date(session.expiresAt))}</strong>
          </div>
        </div>
      </div>

      {/* Global Audit Log List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <span>Oxirgi Audit Amallari Logi ({auditLogs?.length || 0})</span>
        </h3>

        {!auditLogs || auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">Audit log yozuvlari yo‘q</p>
        ) : (
          <div className="space-y-2.5">
            {auditLogs.map((log: any) => (
              <div key={log.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Terminal className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <strong className="font-extrabold text-slate-900 block">{log.admin_username} — {log.action} ({log.target_type})</strong>
                    <span className="text-[11px] text-slate-500">{formatUzbekDate(log.created_at)}</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200 flex-shrink-0">
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
