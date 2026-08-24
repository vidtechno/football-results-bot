import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { SuggestionsModerationClient } from './client';
import { PlusCircle } from 'lucide-react';

export const revalidate = 0;

export default async function AdminSuggestionsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: suggestions } = await supabase
    .from('organization_suggestions')
    .select('*, category:categories(name), region:regions(name)')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-7 h-7 text-blue-600" />
          <span>Foydalanuvchilar Tashkilot Takliflari Moderatsiyasi</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Fuqarolar tomonidan yuborilgan yangi tashkilot takliflarini ko‘rib chiqish, qabul qilish va reestrga kiritish
        </p>
      </div>

      <SuggestionsModerationClient initialSuggestions={suggestions || []} />
    </div>
  );
}
