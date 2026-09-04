import React from 'react';
import { getCurrentProfile } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const isAdmin = Boolean(profile?.is_admin);

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-slate-900 flex flex-col md:flex-row antialiased">
      {isAdmin && <AdminSidebar username={profile?.display_name || 'Admin'} role="Administrator" />}

      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {isAdmin && <AdminMobileNav />}
    </div>
  );
}
