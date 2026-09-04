import React from 'react';
import type { WalletTransaction } from '@/lib/types/platform';
import { formatUZS } from '@/lib/utils/currency';
import { formatUzbekDate } from '@/lib/utils/formatters';
import { ArrowDownLeft, ArrowUpRight, Clock } from 'lucide-react';

interface TransactionHistoryTableProps {
  transactions: WalletTransaction[];
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs font-medium">
        Hozircha hech qanday tranzaksiya mavjud emas.
      </div>
    );
  }

  function getBadgeDetails(type: string) {
    switch (type) {
      case 'topup':
        return { label: 'To‘ldirish', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'purchase_debit':
        return { label: 'Xarid', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'author_sale_credit':
        return { label: 'Muallif daromadi', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'payout_reserve':
        return { label: 'Yechishga band qilindi', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'payout_paid':
        return { label: 'Yechib olindi', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'payout_cancel_reversal':
        return { label: 'Qaytarildi', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { label: type, color: 'bg-slate-50 text-slate-600 border-slate-200' };
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
          <tr>
            <th className="py-3 px-4">Sana</th>
            <th className="py-3 px-4">Turi</th>
            <th className="py-3 px-4">Tavsif</th>
            <th className="py-3 px-4 text-right">Summa</th>
            <th className="py-3 px-4 text-right">Qoldiq</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          {transactions.map((tx) => {
            const isPositive = tx.amount > 0;
            const badge = getBadgeDetails(tx.transaction_type);

            return (
              <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                  {formatUzbekDate(tx.created_at)}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold ${badge.color}`}
                  >
                    {badge.label}
                  </span>
                </td>
                <td className="py-3.5 px-4 max-w-xs truncate text-slate-800">
                  {tx.description}
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap font-black">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      isPositive ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    {isPositive ? '+' : ''}
                    {formatUZS(tx.amount)}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-500 font-mono text-[11px]">
                  {formatUZS(tx.balance_after)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
