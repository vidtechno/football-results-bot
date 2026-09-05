import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Bell, Check, Sparkles, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { formatUzbekDate } from '@/lib/utils/formatters';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Bildirishnomalar',
  description: 'Yangi boblar, xaridlar, hisob to‘ldirishlari va muhim tizim bildirishnomalari.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BildirishnomalarPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/kirish?redirect=/bildirishnomalar');
  }

  const admin = createAdminClient();
  const { data: notifications } = await admin
    .from('in_site_notifications')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const list = notifications || [];
  const unreadCount = list.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight flex items-center gap-2.5">
            <Bell className="w-7 h-7 text-amber-600" />
            <span>Bildirishnomalar</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] font-medium">
            {unreadCount > 0 ? `${unreadCount} ta o‘qilmagan xabar` : 'Barcha xabarlar o‘qilgan'}
          </p>
        </div>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EAE5DD] shadow-xs space-y-3">
          <Bell className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-serif font-bold text-stone-800 text-base">Hozircha bildirishnomalar yo‘q</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Siz kuzatayotgan asarlarning yangi boblari, aksiyalar va to‘lovlar haqida shu yerda xabardor bo‘lasiz.
          </p>
          <Link
            href="/asarlar"
            className="inline-block px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
          >
            Asarlarni ko‘rish
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {list.map((n) => {
            const isUnread = !n.is_read;
            const content = (
              <div
                className={`p-4 sm:p-5 rounded-3xl border transition-all flex items-start gap-3.5 ${
                  isUnread
                    ? 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                    : 'bg-white border-[#EAE5DD]'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    n.type === 'new_chapter'
                      ? 'bg-amber-100 text-amber-800'
                      : n.type === 'promotion'
                      ? 'bg-purple-100 text-purple-800'
                      : n.type === 'topup_approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-100 text-stone-700'
                  }`}
                >
                  {n.type === 'new_chapter' ? (
                    <BookOpen className="w-4.5 h-4.5" />
                  ) : n.type === 'promotion' ? (
                    <Sparkles className="w-4.5 h-4.5" />
                  ) : (
                    <Bell className="w-4.5 h-4.5" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900 truncate">
                      {n.title}
                    </h4>
                    <span className="text-[11px] text-stone-400 shrink-0">
                      {formatUzbekDate(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-normal">
                    {n.body}
                  </p>
                </div>
              </div>
            );

            if (n.link_url) {
              return (
                <Link key={n.id} href={n.link_url} className="block hover:opacity-95">
                  {content}
                </Link>
              );
            }
            return <div key={n.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
