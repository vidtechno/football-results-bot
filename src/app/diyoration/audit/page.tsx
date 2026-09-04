'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Clock,
  Loader2,
  FileText,
  User,
} from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase/client';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          metadata,
          created_at,
          admin:profiles (id, display_name, username, public_id)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter !== 'all') {
        query = query.ilike('action', `%${actionFilter}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setLogs(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-purple-600" />
            <span>Administrator Audit Jurnali</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Barcha ma’muriy amallar, balans o‘zgarishlari va moderatsiya harakatlarining xavfsiz audit yozuvlari
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs font-black">
            Jami: {logs.length} ta yozuv
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Barcha harakatlar' },
          { id: 'wallet_adjustment', label: 'Balans o‘zgartirishlar' },
          { id: 'author', label: 'Mualliflar amallari' },
          { id: 'work', label: 'Asarlar moderatsiyasi' },
          { id: 'payout', label: 'Pul yechish amallari' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setActionFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              actionFilter === f.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            <span>Audit yozuvlari yuklanmoqda...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Audit yozuvlari topilmadi.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const adminInfo = Array.isArray(log.admin) ? log.admin[0] : log.admin;

              return (
                <div key={log.id} className="p-4 sm:p-5 space-y-2 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-purple-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                        {log.action}
                      </span>
                      <span className="text-xs text-slate-500">
                        Obyekt: <strong className="text-slate-800 font-mono">{log.entity_type}</strong>
                        {log.entity_id && (
                          <span className="text-slate-400 font-mono ml-1">({log.entity_id.slice(0, 8)}...)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>Admin: <strong className="text-slate-700">{adminInfo?.display_name || 'Tizim'}</strong></span>
                      <span>•</span>
                      <span>{formatUzbekDate(log.created_at)}</span>
                    </div>
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="text-[11px] font-mono bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-slate-700 overflow-x-auto leading-relaxed">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
