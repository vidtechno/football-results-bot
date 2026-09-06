import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  PenTool,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  BookOpen,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Award,
  Zap,
  Lock,
} from 'lucide-react';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { AuthorEarningsCalculator } from '@/components/author/AuthorEarningsCalculator';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Muallif bo‘ling — Asarlaringizni nashr eting va daromad oling | Manbora',
  description:
    'Manbora platformasida kitoblaringiz va davomli hikoyalaringizni chop eting. Intellektual mulk himoyasi, 80% sof daromad va minglab o‘quvchilar auditoriyasi.',
  alternates: {
    canonical: 'https://manbora.uz/muallif-boling',
  },
  openGraph: {
    title: 'Muallif bo‘ling | Manbora',
    description:
      'Kitob va serialized hikoyalaringizni Manbora’da nashr eting. 80% sof daromad, rasmiy mualliflik huquqi himoyasi va zamonaviy studiya.',
    url: 'https://manbora.uz/muallif-boling',
    type: 'website',
  },
};

export default async function MuallifBolingPage() {
  const profile = await getCurrentProfile();

  const admin = createAdminClient();
  const { data: setting } = await admin
    .from('platform_settings')
    .select('value')
    .eq('key', 'commission_percentage')
    .maybeSingle();

  const commissionPercentage = Number(setting?.value || 20);
  const authorPercentage = 100 - commissionPercentage;

  // Role-aware CTAs
  let primaryCtaUrl = '/kirish?mode=register&role=author';
  let primaryCtaLabel = 'Muallif sifatida ro‘yxatdan o‘tish';
  let secondaryCtaUrl: string | null = '/kirish?mode=login';
  let secondaryCtaLabel: string | null = 'Tizimga kirish';

  if (profile) {
    if (profile.role === 'author' || profile.role === 'admin') {
      primaryCtaUrl = '/muallif';
      primaryCtaLabel = 'Muallif studiyasiga o‘tish';
      secondaryCtaUrl = '/muallif';
      secondaryCtaLabel = 'Yangi asar qo‘shish';
    } else {
      primaryCtaUrl = '/muallif';
      primaryCtaLabel = 'Mualliflikka ariza topshirish';
      secondaryCtaUrl = null;
      secondaryCtaLabel = null;
    }
  }

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden rounded-3xl sm:rounded-4xl bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 text-white p-8 sm:p-14 lg:p-20 shadow-2xl border border-stone-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,119,6,0.18),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mualliflar uchun yangi imkoniyat</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-serif tracking-tight leading-[1.15]">
            Asarlaringizni o‘quvchilarga yetkazing va <span className="text-amber-400">erkin daromad</span> oling.
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-stone-300 leading-relaxed max-w-2xl font-normal">
            Manbora — o‘zbek yozuvchilari va ijodkorlari uchun yaratilgan milliy adabiy platforma. Kitob yoki
            davomli hikoyalaringizni nashr eting, intellektual mulkingizni himoyalang va daromadning{' '}
            <strong className="text-white font-bold">{authorPercentage}%</strong> qismini to‘g‘ridan-to‘g‘ri kartangizga oling.
          </p>

          <div className="flex flex-wrap items-center gap-3.5 pt-4">
            <Link
              href={primaryCtaUrl}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95"
            >
              <span>{primaryCtaLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {secondaryCtaUrl && (
              <Link
                href={secondaryCtaUrl}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 border border-stone-700/80 font-bold text-xs sm:text-sm transition-colors"
              >
                <span>{secondaryCtaLabel}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 2. Platform Advantages / Features */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-4xl font-serif font-black text-stone-900 tracking-tight">
            Nega aynan Manbora?
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Biz muallifning mehnati, vaqti va ijodiy erkinligini birinchi o‘ringa qo‘yamiz.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Format erkinligi</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tugallangan qissa, roman yoki haftalik yangi boblar bilan to‘ldiriladigan serialized hikoyalarni chop eting.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Moslashuvchan narxlash</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Butun kitob uchun bitta narx belgilang yoki har bir bobni alohida (masalan, dastlabki boblar bepul, keyingilari pullik) soting.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Real-vaqt statistikasi</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              O‘quvchilar soni, mutolaa sahifalari, kitobxonlar fikrlari va tushumlarni shaxsiy studiyangizda jonli kuzating.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Kafolatlangan to‘lovlar</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Har bir xarid avtomatik muallif balansiga tushadi. Uzcard va Humo kartalariga minimal chegarasiz oson yechib oling.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Copyright Protection Section */}
      <section className="bg-stone-900 text-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-stone-800 relative overflow-hidden">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Mualliflik huquqi daxlsizligi</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight">
            Asaringiz har doim o‘zingizga tegishli bo‘lib qoladi
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Biz no-eksklyuziv modelda ishlaymiz. Siz asaringizning yagona intellektual egasisiz. Manbora platformasi
            faqat raqamli nashr va tarqatish vositasi sifatida xizmat qiladi.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-1">
              <h4 className="font-bold text-stone-200 text-sm">Anti-pirat himoyasi</h4>
              <p className="text-[11px] text-stone-400">
                Matn nusxa olishdan va skrinshotlardan texnik himoyalangan.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-1">
              <h4 className="font-bold text-stone-200 text-sm">Rasmiy ommaviy oferta</h4>
              <p className="text-[11px] text-stone-400">
                O‘zbekiston Respublikasi qonunchiligiga to‘liq mos elektron shartnoma.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-1">
              <h4 className="font-bold text-stone-200 text-sm">Erkin tasarruf</h4>
              <p className="text-[11px] text-stone-400">
                Istalgan vaqtda asarni tahrirlash, narxini o‘zgartirish yoki to‘xtatish huquqi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive Earnings Calculator */}
      <section className="space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1 mb-8">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
            Daromad taqsimoti va kalkulyator
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Platforma komissiyasi atigi {commissionPercentage}%. Qolgan barcha daromad bevosita muallifga tegishli.
          </p>
        </div>

        <AuthorEarningsCalculator commissionPercentage={commissionPercentage} />
      </section>

      {/* 5. How It Works (4 Steps) */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
            Nashr jarayoni: 4 oddiy qadam
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Bir necha daqiqa ichida birinchi kitobingizni o‘quvchilar bilan bo‘lishing
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              1
            </span>
            <h3 className="font-serif font-bold text-base text-stone-900">Profil oching</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Mualliflikka ro‘yxatdan o‘ting, taxallusingiz va qisqacha biografiyangizni kiriting.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              2
            </span>
            <h3 className="font-serif font-bold text-base text-stone-900">Asarni yuklang</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Asar muqovasi, tavsifi va dastlabki boblar matnini qulay muharririmiz orqali joylang.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              3
            </span>
            <h3 className="font-serif font-bold text-base text-stone-900">Narx belgilang</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Asarni bepul qiling yoki narxini o‘zingiz erkin belgilab, moderatsiyaga yuboring.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              4
            </span>
            <h3 className="font-serif font-bold text-base text-stone-900">Daromad oling</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Asaringiz tasdiqlangach, minglab o‘quvchilar uni o‘qishni boshlaydi va har bir xarid sizga daromad keltiradi.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Moderation & FAQ Rules */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-stone-900 tracking-tight">
            Ko‘p so‘raladigan savollar va qoidalar
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Asar qabul qilish talablari va moderatsiya tartibi haqida
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto text-xs sm:text-sm">
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Qanday asarlar qabul qilinadi?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Badiiy, ilmiy-ommabop, she’riy, biznes, tarixiy va bolalar adabiyoti qabul qilinadi. Barcha janrlar
              uchun eshiklarimiz ochiq.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Moderatsiya qancha vaqt oladi?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Odatda 24 dan 48 soatgacha. Muharrirlarimiz asar formati, orfografiyasi va mualliflik huquqi tozaligini
              tekshiradi.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Plagiat va ko‘chirmachilikka munosabat?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Boshqa muallif asarini uning ruxsatisiz yuklash qat’iyan man etiladi. Qoidabuzarlik aniqlansa, profil va
              balans bloklanadi.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Pulni qachon va qanday yechish mumkin?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Balansingizda mablag‘ yig‘ilgach, istalgan paytda muallif kabinetidan o‘zbek kartalaringizga yechib olish
              arizasi berasiz.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="text-center p-8 sm:p-12 rounded-3xl bg-amber-50 border border-amber-200/80 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-600 text-stone-950 flex items-center justify-center mx-auto shadow-sm">
          <PenTool className="w-6 h-6" />
        </div>
        <h3 className="font-serif font-black text-2xl sm:text-3xl text-stone-900">
          O‘z kitobingizni bugunoq nashr eting
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
          Minglab kitobxonlar yangi va qiziqarli asarlarni kutmoqda. Bizga qo‘shiling va ijodingizni qadrlang.
        </p>
        <div className="pt-2">
          <Link
            href={primaryCtaUrl}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-black text-xs sm:text-sm transition-all shadow-md active:scale-95"
          >
            <span>{primaryCtaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
