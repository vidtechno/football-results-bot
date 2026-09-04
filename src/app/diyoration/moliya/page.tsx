'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  TrendingUp,
  History,
  Filter,
  Loader2,
  Calendar,
  CreditCard,
  BookOpen,
} from 'lucide-react';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { supabase } from '@/lib/supabase/client';

export default function AdminFinancePage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [platformRevenue, setPlatformRevenue] = useState<number>(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch system platform revenue account
      const { data: revAcc } = await supabase
        .from('wallet_accounts')
        .select('balance')
        .eq('account_type', 'platform_revenue')
        .maybeSingle();

      if (revAcc) {
        setPlatformRevenue(Number(revAcc.balance || 0));
      }

      // 2. Fetch immutable transactions ledger
      let query = supabase
        .from('wallet_transactions')
        .select(`
          id,
          amount,
          transaction_type,
          reference_type,
          reference_id,
          description,
          balance_after,
          created_at,
          account:wallet_accounts (
            user_id,
            account_type,
            profile:profiles (public_id, display_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') {
        query = query.eq('transaction_type', typeFilter);
      }

      const { data: txData, error } = await query;
      if (!error && txData) {
        setTransactions(txData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <span>Moliyaviy Registr va Hamyon Amallari</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manbora platformasining o‘zgarmas moliyaviy tranzaksiyalar daftari (Immutable Ledger)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white shadow-sm flex items-center gap-4">
          <div>
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
              Platforma Jami Daromadi
            </span>
            <p className="font-serif text-xl sm:text-2xl font-black text-white mt-0.5">
              {formatUZS(platformRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Barcha amallar' },
          { id: 'topup', label: 'Hisob to‘ldirishlar' },
          { id: 'purchase_debit', label: 'Kitobxon xaridlari' },
          { id: 'author_sale_credit', label: 'Muallif gonorarlari' },
          { id: 'platform_fee_credit', label: 'Platforma komissiyasi' },
          { id: 'adjustment', label: 'Admin tuzatishlari' },
          { id: 'payout_paid', label: 'Muallifga to‘langan' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setTypeFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              typeFilter === f.id
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Tranzaksiyalar yuklanmoqda...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-semibold">
            Tranzaksiyalar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-5">Tavsif va Maqsad</th>
                  <th className="py-3 px-4">Foydalanuvchi</th>
                  <th className="py-3 px-4">Turi</th>
                  <th className="py-3 px-4">Summa</th>
                  <th className="py-3 px-4">Qoldiq</th>
                  <th className="py-3 px-5 text-right">Sana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {transactions.map((tx) => {
                  const isPositive = tx.amount > 0;
                  const accountInfo = Array.isArray(tx.account) ? tx.account[0] : tx.account;
                  const profile = accountInfo?.profile;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <strong className="font-bold text-slate-900 block">{tx.description}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {tx.id.slice(0, 12)}...
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {profile ? (
                          <div>
                            <span className="font-bold text-slate-800 block text-xs">{profile.display_name}</span>
                            <span className="font-mono text-blue-900 text-[10px]">{profile.public_id}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Platforma / Tizim</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-serif font-black text-sm ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? '+' : ''}{formatUZS(tx.amount)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-serif font-bold text-slate-700">
                        {formatUZS(tx.balance_after)}
                      </td>
                      <td className="py-3.5 px-5 text-right text-slate-400 text-[11px]">
                        {formatUzbekDate(tx.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
