import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Users, ShieldCheck, UserCheck } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: adminUsers } = await supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          <span>Administratorlar & Rollar Boshqaruvi</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Tizim administratorlari va kelajakdagi ruxsat darajalari (RBAC) nazorati
        </p>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Tizim Administratorlari ({adminUsers?.length || 1})</span>
          </h3>
        </div>

        <div className="space-y-3">
          {adminUsers?.map((u: any) => (
            <div key={u.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong className="text-sm font-black text-slate-900 block">{u.username}</strong>
                  <span className="text-xs text-slate-500 font-medium">Qo‘shilgan sana: {formatUzbekDate(u.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold uppercase">
                  {u.role} (Ega)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role Definitions Explanation */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3 text-xs">
        <h4 className="font-extrabold text-slate-900 text-sm">Ruxsat Darajalari (RBAC Framework):</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/70 space-y-1">
            <strong className="text-blue-900 font-black block">1. Owner (Ega)</strong>
            <p className="text-slate-600 font-medium">To‘liq ruxsat: tashkilotlarni tahrirlash, o‘chirish, moderatorlik, adminlar va tizim sozlamalarini boshqarish.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/70 space-y-1">
            <strong className="text-indigo-900 font-black block">2. Editor (Muharrir)</strong>
            <p className="text-slate-600 font-medium">Tashkilot va raqamli xizmatlar ma’lumotlarini yaratish, tahrirlash va chop etish ruxsati.</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-1">
            <strong className="text-emerald-900 font-black block">3. Reviewer (Moderator)</strong>
            <p className="text-slate-600 font-medium">Foydalanuvchi xabarnomalarini ko‘rib chiqish va statusini hal qilish ruxsati.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
