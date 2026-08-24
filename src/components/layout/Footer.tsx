import React from 'react';
import Link from 'next/link';
import { PhoneCall, ShieldAlert } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white text-slate-600 text-sm py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2 font-extrabold text-slate-900 text-lg">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white text-sm font-bold">
                <PhoneCall className="w-4 h-4" />
              </div>
              <span>Bog‘lanish</span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md">
              O‘zbekistondagi davlat va xususiy tashkilotlar, banklar, kommunal va mobil operatorlarning rasmiy aloqa ma’lumotlari, telefon raqamlari hamda manzillari yagona ma’lumotlar bazasi.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Bo‘limlar</h4>
            <ul className="space-y-1.5 text-xs">
              <li><Link href="/" className="hover:text-sky-600 transition-colors">Bosh sahifa</Link></li>
              <li><Link href="/search" className="hover:text-sky-600 transition-colors">Qidiruv</Link></li>
              <li><Link href="/categories" className="hover:text-sky-600 transition-colors">Kategoriyalar</Link></li>
              <li><Link href="/regions" className="hover:text-sky-600 transition-colors">Viloyatlar</Link></li>
              <li><Link href="/about" className="hover:text-sky-600 transition-colors">Biz haqimizda</Link></li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Ommabop</h4>
            <ul className="space-y-1.5 text-xs text-slate-500">
              <li><Link href="/categories/banklar" className="hover:text-sky-600 transition-colors">Banklar</Link></li>
              <li><Link href="/categories/davlat-tashkilotlari" className="hover:text-sky-600 transition-colors">Davlat tashkilotlari</Link></li>
              <li><Link href="/categories/mobil-operatorlar" className="hover:text-sky-600 transition-colors">Mobil operatorlar</Link></li>
              <li><Link href="/categories/kommunal" className="hover:text-sky-600 transition-colors">Kommunal xizmatlar</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Bar */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-500">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Ogohlantirish:</strong> Ushbu platformadagi ma’lumotlar ochiq rasmiy manbalardan to‘plangan. Muhim yoki shoshilinch masalalarda telefon raqamlari va manzillarini bevosita tashkilotning rasmiy veb-sayti orqali qayta tekshirishingiz tavsiya etiladi.
          </p>
        </div>

        {/* Copyright */}
        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Bog‘lanish (O‘zbekiston). Barcha huquqlar himoyalangan.
        </div>
      </div>
    </footer>
  );
}
