'use client';

import React, { useEffect, useState } from 'react';
import { Settings, ShieldCheck, History, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatUzbekDate } from '@/lib/utils/formatters';

export default function AdminSettingsPage() {
  const [commission, setCommission] = useState('20');
  const [minPayout, setMinPayout] = useState('100000');
  const [telegram, setTelegram] = useState('diyorbek_anorboyev');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettingsAndLogs();
  }, []);

  async function loadSettingsAndLogs() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        if (data.settings.commission_percentage !== undefined) {
          setCommission(String(data.settings.commission_percentage));
        }
        if (data.settings.minimum_payout !== undefined) {
          setMinPayout(String(data.settings.minimum_payout));
        }
        if (data.settings.telegram_support_username !== undefined) {
          setTelegram(String(data.settings.telegram_support_username));
        }
      }

      const { data: logs } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      setAuditLogs(logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionPercentage: Number(commission),
          minimumPayout: Number(minPayout),
          telegramUsername: telegram.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Saqlashda xatolik yuz berdi');
      }

      setMessage({ type: 'success', text: 'Sozlamalar muvaffaqiyatli saqlandi!' });
      await loadSettingsAndLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Xatolik yuz berdi' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 font-bold text-xs sm:text-sm">
        Sozlamalar yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-700" />
          <span>Platforma Sozlamalari & Audit</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Manbora platformasi komissiyasi, to‘lov parametrlari va audit jurnali
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Platform Financial Settings Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span>Moliyaviy va Platforma parametrlari</span>
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Platforma komissiyasi (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Odatiy: 20%. Asar xarid qilinganda avtomatik ushlab qolinadi.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">
                Minimal pul yechish miqdori (so‘m)
              </label>
              <input
                type="number"
                step="10000"
                min="10000"
                value={minPayout}
                onChange={(e) => setMinPayout(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Odatiy: 100 000 so‘m. Muallif so‘rovi uchun minimal chegara.
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Admin Telegram username (qo‘llab-quvvatlash uchun)
            </label>
            <div className="flex items-center">
              <span className="px-3 py-3 rounded-l-xl bg-slate-100 border border-r-0 border-slate-200 text-slate-500 font-bold text-sm">
                @
              </span>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-full px-4 py-3 rounded-r-xl border border-slate-200 text-sm font-bold text-slate-900"
                required
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Hisob to‘ldirishda kitobxonlar chek yuborishi uchun Telegram havolasi.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Sozlamalarni saqlash</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Audit Log List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600" />
          <span>Oxirgi Audit Amallari Logi ({auditLogs.length})</span>
        </h3>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">Audit log yozuvlari yo‘q</p>
        ) : (
          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs gap-3"
              >
                <div>
                  <strong className="font-extrabold text-slate-900 block">
                    {log.action} ({log.entity_type})
                  </strong>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {log.entity_id} • {formatUzbekDate(log.created_at)}
                  </span>
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
