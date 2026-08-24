import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { MapPin, Plus } from 'lucide-react';

export const revalidate = 0;

export default async function AdminRegionsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: regions } = await supabase
    .from('regions')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-blue-600" />
          <span>Viloyatlar va Hududlar Boshqaruvi</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          O‘zbekiston Respublikasi viloyatlari va shahar hududlarini tartiblash
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900">Mavjud Hududlar ({regions?.length || 0})</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {regions?.map((r: any) => (
            <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <strong className="text-sm font-extrabold text-slate-900 block">{r.name}</strong>
                <span className="text-xs font-mono text-slate-400">/{r.slug}</span>
              </div>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                #{r.sort_order}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
