import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/kirish?redirect=/diyoration');
  }

  if (!profile.is_admin) {
    return (
      <div className="min-h-screen bg-[#F6F9FF] text-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl shadow-blue-950/5 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">403 — Ruxsat berilmagan</h1>
            <p className="text-sm text-slate-500 font-medium mt-2">
              Ushbu bo‘lim faqat tizim ma’murlari uchun mo‘ljallangan. Sizning hisobingizda administratorlik huquqi mavjud emas.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Bosh sahifaga qaytish</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-slate-900 flex flex-col md:flex-row antialiased">
      <AdminSidebar username={profile.display_name || 'Admin'} role="Administrator" />

      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      <AdminMobileNav />
    </div>
  );
}
