import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Compass, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sahifa topilmadi',
  description: 'Siz qidirayotgan sahifa mavjud emas, o‘chirilgan yoki manzili o‘zgargan bo‘lishi mumkin.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-[#FBF9F5]">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Visual Badge / Icon */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-xs">
          <Compass className="w-12 h-12 text-[#B45309] animate-pulse" />
          <span className="absolute -top-2 -right-2 px-2.5 py-0.5 rounded-full bg-[#1C1917] text-amber-200 text-xs font-black tracking-wider shadow-xs">
            404
          </span>
        </div>

        {/* Heading and Description */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-[#1C1917] tracking-tight">
            Sahifa topilmadi
          </h1>
          <p className="text-sm sm:text-base text-[#78716C] leading-relaxed">
            Siz qidirayotgan sahifa mavjud emas, o‘chirilgan yoki manzili o‘zgargan bo‘lishi mumkin.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#1C1917] hover:bg-[#292524] text-white text-sm font-bold shadow-sm transition-colors"
          >
            <Home className="w-4 h-4 text-amber-400" />
            <span>Bosh sahifaga qaytish</span>
          </Link>
          <Link
            href="/asarlar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white hover:bg-stone-50 text-[#1C1917] border border-[#EAE5DD] text-sm font-bold shadow-xs transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#B45309]" />
            <span>Asarlarni ko‘rish</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
