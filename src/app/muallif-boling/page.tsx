import React from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
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
  FileText,
  BarChart3,
  WalletCards,
  Eye,
} from 'lucide-react';
import { getCurrentProfile, createAdminClient } from '@/lib/supabase/server';
import { AuthorEarningsCalculator } from '@/components/author/AuthorEarningsCalculator';

export const revalidate = 60;

const getCachedCommissionPercentage = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'commission_percentage')
      .maybeSingle();
    return Number(data?.value || 20);
  },
  ['author-landing-commission-v1'],
  { revalidate: 300, tags: ['platform-settings'] },
);

export const metadata: Metadata = {
  title: 'Muallif bo‘ling',
  description:
    'Manbora platformasida kitoblaringiz va davomli hikoyalaringizni chop eting. Intellektual mulk himoyasi, 80% sof daromad va minglab o‘quvchilar auditoriyasi.',
  alternates: {
    canonical: 'https://manbora.uz/muallif-boling',
  },
  openGraph: {
    title: 'Muallif bo‘ling',
    description:
      'Kitob va davomli hikoyalaringizni Manbora’da nashr eting. 80% sof daromad, rasmiy mualliflik huquqi himoyasi va zamonaviy studiya.',
    url: 'https://manbora.uz/muallif-boling',
    type: 'website',
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manbora’da muallif bo‘ling',
    description:
      'Kitob va hikoyangizni nashr eting, o‘quvchi toping va ijodingizdan daromad oling.',
    images: ['/opengraph-image'],
  },
};

export default async function MuallifBolingPage() {
  const [profile, commissionPercentage] = await Promise.all([
    getCurrentProfile(),
    getCachedCommissionPercentage(),
  ]);

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
    <div className="author-landing space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section */}
      <section className="author-hero relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#132a23] via-[#173d31] to-[#0d1f1a] text-white p-7 sm:p-12 lg:p-16 shadow-2xl border border-emerald-800/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(251,191,36,0.18),transparent_34%)] pointer-events-none" />
        <div className="absolute -right-20 -bottom-28 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -right-6 -bottom-16 h-56 w-56 rounded-full border border-amber-300/15" />
        <div className="relative z-10 grid lg:grid-cols-[1fr_340px] gap-10 lg:gap-16 items-center">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Hikoyangiz o‘quvchisini kutmoqda</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black font-sans tracking-tight leading-[1.15]">
              Yozganingizni javonda emas, <span className="text-amber-300">minglab qalblarda</span>{' '}
              saqlang.
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-stone-300 leading-relaxed max-w-2xl font-normal">
              Manbora kitob va hikoyangizni nashr qilish, o‘quvchi topish va ijodingizdan daromad
              olishni bir joyga jamlaydi. Narxni siz belgilaysiz, ayrim boblarni bepul ochasiz va
              har bir sotuvning{' '}
              <strong className="text-amber-200 font-bold">{authorPercentage}% ulushini</strong>{' '}
              olasiz.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              <Link
                href={primaryCtaUrl}
                className="author-primary-cta inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-black/20 active:scale-95"
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
          <div className="author-proof-card relative hidden lg:block rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
                  Muallif ulushi
                </p>
                <p className="mt-1 font-sans text-5xl font-black text-white">{authorPercentage}%</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-emerald-950">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 space-y-3 text-xs text-emerald-50">
              {[
                ['Narx', 'Muallif belgilaydi'],
                ['Bepul boblar', 'Muallif tanlaydi'],
                ['Nashr formati', 'Kitob yoki hikoya'],
                ['Hisobot', 'Shaffof analitika'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-emerald-200/75">{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: PenTool, title: 'Qulay muharrir', text: 'Boblarni yozing va tahrirlang' },
          { icon: BarChart3, title: 'Aniq statistika', text: 'O‘qish va sotuvlarni kuzating' },
          { icon: ShieldCheck, title: 'Sizning asaringiz', text: 'Huquq va boshqaruv sizda' },
          { icon: WalletCards, title: 'Shaffof daromad', text: 'Har bir xarid hisobda ko‘rinadi' },
        ].map(({ icon: Icon, title, text }) => (
          <div
            key={title}
            className="author-mini-card rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
          >
            <Icon className="h-5 w-5 text-emerald-700" />
            <h3 className="mt-3 text-xs sm:text-sm font-black text-stone-900">{title}</h3>
            <p className="mt-1 text-[10px] sm:text-xs leading-relaxed text-stone-500">{text}</p>
          </div>
        ))}
      </section>

      {/* 2. Platform Advantages / Features */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-4xl font-sans font-black text-stone-900 tracking-tight">
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
            <h3 className="font-sans font-bold text-base text-stone-900">Format erkinligi</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Kitob yoki hikoya nashr eting. Ikkalasida ham bitta yoki bir nechta bob bilan
              ishlashingiz mumkin.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-base text-stone-900">
              Narx sizning qo‘lingizda
            </h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Asarga bitta umumiy narx belgilang. O‘quvchi tanishishi uchun xohlagan boblaringizni
              bepul oching.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-base text-stone-900">O‘quvchini tushuning</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              O‘qishlar, tugatish ko‘rsatkichi, kitobxonlar fikri, sotuv va tushumlarni studiyada
              kuzating.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-xs hover:border-amber-400 transition-colors space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-sans font-bold text-base text-stone-900">Shaffof hisob-kitob</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Har bir xarid va muallif ulushi tizimda qayd etiladi. Mablag‘ni yechish so‘rovini
              studiyadan yuborasiz.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Copyright Protection Section */}
      <section className="bg-stone-900 text-white rounded-3xl sm:rounded-4xl p-8 sm:p-12 border border-stone-800 relative overflow-hidden">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Ijodingiz ustidan nazorat o‘zingizda</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-sans font-black tracking-tight">
            Asaringiz har doim o‘zingizga tegishli bo‘lib qoladi
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Biz no-eksklyuziv modelda ishlaymiz. Siz asaringizning yagona intellektual egasisiz.
            Manbora platformasi faqat raqamli nashr va tarqatish vositasi sifatida xizmat qiladi.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-1">
              <h4 className="font-bold text-stone-200 text-sm">Anti-pirat himoyasi</h4>
              <p className="text-[11px] text-stone-400">
                O‘qish interfeysi oddiy nusxa ko‘chirishni cheklashga yordam beradi.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-stone-800/80 border border-stone-700 space-y-1">
              <h4 className="font-bold text-stone-200 text-sm">Rasmiy ommaviy oferta</h4>
              <p className="text-[11px] text-stone-400">
                Platforma shartlari asarni nashr qilish va daromad taqsimotini belgilaydi.
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
          <h2 className="text-2xl sm:text-3xl font-sans font-black text-stone-900 tracking-tight">
            Daromad taqsimoti va kalkulyator
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Platforma komissiyasi atigi {commissionPercentage}%. Qolgan barcha daromad bevosita
            muallifga tegishli.
          </p>
        </div>

        <AuthorEarningsCalculator commissionPercentage={commissionPercentage} />
      </section>

      {/* 5. How It Works (4 Steps) */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl sm:text-3xl font-sans font-black text-stone-900 tracking-tight">
            Nashr jarayoni: 4 oddiy qadam
          </h2>
          <p className="text-xs sm:text-sm text-stone-600">
            Arizadan ilk o‘quvchigacha bo‘lgan yo‘l tushunarli va boshqariladigan
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              1
            </span>
            <h3 className="font-sans font-bold text-base text-stone-900">Profil oching</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Taxallus, qisqacha biografiya va ijodingiz haqida ma’lumot bilan ariza yuboring.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              2
            </span>
            <h3 className="font-sans font-bold text-base text-stone-900">Asarni yuklang</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Kitob yoki hikoya turini tanlang, muqova, tavsif va boblarni qulay muharrirda joylang.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              3
            </span>
            <h3 className="font-sans font-bold text-base text-stone-900">Narx belgilang</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Asarni bepul qiling yoki umumiy narx belgilang. Qaysi boblar bepul bo‘lishini o‘zingiz
              tanlang.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-stone-200 space-y-3 relative">
            <span className="w-8 h-8 rounded-xl bg-amber-600 text-stone-950 font-mono font-black text-sm flex items-center justify-center">
              4
            </span>
            <h3 className="font-sans font-bold text-base text-stone-900">Daromad oling</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Moderatsiyadan so‘ng asar katalogga chiqadi. O‘qishlar, fikrlar va daromadni
              studiyadan kuzatasiz.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Moderation & FAQ Rules */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-2xl sm:text-3xl font-sans font-black text-stone-900 tracking-tight">
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
              Badiiy, ilmiy-ommabop, she’riy, biznes, tarixiy va bolalar adabiyoti qabul qilinadi.
              Barcha janrlar uchun eshiklarimiz ochiq.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Moderatsiya qancha vaqt oladi?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Muddat navbat va asar hajmiga bog‘liq. Jamoa format, mazmun talablari va mualliflik
              huquqi tozaligini tekshiradi.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Plagiat va ko‘chirmachilikka munosabat?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Boshqa muallif asarini uning ruxsatisiz yuklash qat’iyan man etiladi. Qoidabuzarlik
              aniqlansa, profil va balans bloklanadi.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1.5">
            <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Pulni qachon va qanday yechish mumkin?</span>
            </h4>
            <p className="text-stone-600 leading-relaxed text-xs">
              Muallif balansida kamida 100 000 so‘m yig‘ilgach, studiyadan pul yechish so‘rovini
              yuborishingiz mumkin.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="text-center p-8 sm:p-12 rounded-3xl bg-amber-50 border border-amber-200/80 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-600 text-stone-950 flex items-center justify-center mx-auto shadow-sm">
          <PenTool className="w-6 h-6" />
        </div>
        <h3 className="font-sans font-black text-2xl sm:text-3xl text-stone-900">
          Keyingi o‘qiladigan asar sizniki bo‘lishi mumkin
        </h3>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
          Qo‘lyozmangizni o‘quvchiga yetkazing, auditoriyangizni yarating va ijodingizni daromadga
          aylantiring.
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
