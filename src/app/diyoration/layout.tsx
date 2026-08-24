import React from 'react';
import { getAdminSession } from '@/lib/admin/auth';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminMobileNav } from '@/components/admin/AdminMobileNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-[#F6F9FF] text-slate-900 flex flex-col md:flex-row antialiased">
      {session && <AdminSidebar username={session.username} role={session.role} />}

      <div className="flex-1 flex flex-col min-w-0 pb-24 md:pb-12">
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>

      {session && <AdminMobileNav />}
    </div>
  );
}
