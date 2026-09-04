import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { Users, ShieldCheck } from 'lucide-react';
import { formatUzbekDate } from '@/lib/utils/formatters';

export const revalidate = 0;

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_admin) {
    redirect('/diyoration');
  }

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
            Ma’lumotlar bazasida hozircha admin bayrog‘i o‘rnatilgan profil yo‘q.
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
                    <span className="text-xs text-slate-500 font-mono">
                      {u.id}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Administrator</span>
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {formatUzbekDate(u.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
