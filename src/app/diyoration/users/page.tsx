import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { Users, ShieldCheck } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', true)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-blue-600" />
          <span>Administratorlar va Ruxsatlar</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Manbora platformasi ma’murlari va tizim huquqlari
        </p>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Platforma Administratorlari ({adminProfiles?.length || 0})</span>
          </h3>
        </div>

        {(!adminProfiles || adminProfiles.length === 0) ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
            Ma’lumotlar bazasida hozircha admin bayrog‘i o‘rnatilgan profil yo‘q. (Seans orqali kirilgan: <strong>{session.username}</strong>)
          </div>
        ) : (
          <div className="space-y-3">
            {adminProfiles.map((u: any) => (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center">
                    {u.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong className="text-sm font-black text-slate-900 block">
                      {u.display_name} (@{u.username})
                    </strong>
                    <span className="text-xs text-slate-500 font-medium font-mono">
                      ID: {u.public_id} • {formatUzbekDate(u.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold uppercase">
                    Admin
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How to add new admin guidance */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3 text-xs">
        <h4 className="font-extrabold text-slate-900 text-sm">
          Yangi administrator tayinlash:
        </h4>
        <p className="text-slate-600 leading-relaxed font-medium">
          Xavfsizlik nuqtai nazaridan, oddiy foydalanuvchilar o‘zlariga o‘zlari admin huquqini bera olmaydi. Yangi admin tayinlash uchun Supabase SQL Editor orqali quyidagi buyruqni bajaring:
        </p>
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto">
          UPDATE public.profiles SET is_admin = true WHERE username = &apos;foydalanuvchi_nomi&apos;;
        </div>
      </div>
    </div>
  );
}
