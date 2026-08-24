import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { CategoriesManagerClient } from './client';
import { FolderTree } from 'lucide-react';

export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const session = await getAdminSession();
  if (!session) redirect('/diyoration');

  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
          <FolderTree className="w-7 h-7 text-indigo-600" />
          <span>Kategoriyalar Boshqaruvi</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Kategoriyalarni tahrirlash, tartiblash va yangi sohalarni qo‘shish
        </p>
      </div>

      <CategoriesManagerClient initialCategories={categories || []} />
    </div>
  );
}
