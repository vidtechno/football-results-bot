import React from 'react';
import Link from 'next/link';
import { BookOpen, Send, ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white text-slate-600 text-xs py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Logo & Platform Mission */}
          <div className="space-y-2 max-w-md">
            <Link href="/" className="flex items-center gap-2 font-black text-slate-900 text-base">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-lg">Manbora</span>
            </Link>
            <p className="text-slate-500 leading-relaxed text-xs font-medium">
              Manbora — O‘zbek tilidagi kitoblar va davomli asarlar platformasi. Mualliflar o‘z asarlarini keng kitobxonlar ommasiga taqdim etadi va daromad topadi. Kitobxonlar esa erkin mutolaadan bahramand bo‘ladi.
            </p>
          </div>

          {/* Nav Links */}
          <div className="flex flex-wrap items-center gap-5 sm:gap-7 font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Bosh sahifa</Link>
            <Link href="/asarlar" className="hover:text-blue-600 transition-colors">Barcha asarlar</Link>
            <Link href="/muallif" className="hover:text-blue-600 transition-colors">Mualliflar uchun</Link>
            <Link href="/kabinet" className="hover:text-blue-600 transition-colors">Shaxsiy kabinet</Link>
            <a
              href="https://t.me/diyorbek_anorboyev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Qo‘llab-quvvatlash (@diyorbek_anorboyev)</span>
            </a>
          </div>
        </div>

        {/* Security & Financial Notice */}
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              <strong>Xavfsiz hisob-kitob:</strong> Barcha xaridlar va muallif daromadlari platforma orqali shaffof hamda kafolatlangan holda amalga oshiriladi.
            </span>
          </div>

          <span className="text-slate-500 text-[11px]">
            Minimal yechib olish miqdori: <strong>100 000 so‘m</strong>
          </span>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
          <span>© {new Date().getFullYear()} Manbora. Barcha huquqlar himoyalangan.</span>
          <span className="flex items-center gap-1">
            O‘zbek kitobxonlari va mualliflari uchun yaratilgan <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          </span>
        </div>
      </div>
    </footer>
  );
}
