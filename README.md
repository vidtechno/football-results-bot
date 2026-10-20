# Manbora — O‘zbek kitob va davomli asarlar platformasi (`https://manbora.uz`)

**Manbora** — zamonaviy o‘zbek kitobxonlari va mualliflari platformasi. Mualliflar o‘z kitoblari va davomli (serialized) hikoyalarini nashr etadi, kitobxonlar esa erkin mutolaa qiladi hamda Manbora balansi orqali pullik boblar yoki to‘liq asarlarni xarid qiladi.

Ishlab chiqilgan texnologiyalar: **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Row Level Security (RLS)**, **Vitest**, va **Zod**.

---

## 🌟 Asosiy imkoniyatlar

1. **Kitobxonlar uchun**:
   - Badiiy adabiyot, detektiv, fantastika, romantika, tarixiy va boshqa janrlardagi asarlarni qulay qidirish va saralash.
   - Chalg‘ituvchi elementlarsiz, shrift o‘lchami va intervalini moslash mumkin bo‘lgan mutolaa sahifasi.
   - Qulay hisob to‘ldirish tizimi: tanlangan summa bo‘yicha so‘rov yaratish va Telegram orqali (@manbora_admin) chek yuborish.
   - Shaxsiy kabinetda hamyon balansi, xaridlar, saqlangan asarlar va mutolaa tarixi.

2. **Mualliflar uchun (Muallif Studiyasi)**:
   - Mualliflikka ariza berish va tasdiqlanish.
   - Asar yaratish (kitob yoki serialized qissa), muqova va annotatsiya kiritish.
   - Boblar muharriri: boblarni yozish, bepul/pullik holatini va narxini belgilash.
   - Moderatsiyaga yuborish va e’lon qilish.
   - Shaffof moliya: jami kitob savdosi, 20% platforma komissiyasi, 80% sof muallif daromadi.
   - Pul yechib olish (Payout): mavjud daromad kamida 100 000 so‘m bo‘lganda so‘rov yuborish (Uzcard / Humo).

3. **Administrator uchun (`/diyoration`)**:
   - Foydalanuvchilar va mualliflar statistikasi.
   - Kitobxonlarning hisob to‘ldirish so‘rovlarini tekshirish, to‘lov chekini biriktirish va balansni atomik ravishda to‘ldirish.
   - Mualliflarning pul yechish so‘rovlarini to‘lov cheki bilan tasdiqlash yoki rad etish (band qilingan mablag‘ avtomatik qaytariladi).
   - Asarlar va mualliflik arizalarini moderatsiya qilish.
   - Platforma komissiyasi va minimal to‘lov summalarini boshqarish.
   - Audit jurnali.

---

## 🗄️ Ma’lumotlar bazasi va migratsiya

Baza — Supabase loyihasi **Manbora** (Postgres 17, 40+ jadval, hammasida RLS yoqilgan). Sxema `supabase/migrations/` ichidagi **011 dan 051 gacha** fayllar ketma-ketligi bilan hosil bo‘ladi (011 — asosiy sxema, qolganlari — keyingi o‘zgarishlar). Fayllarni raqam tartibida qo‘llang.

- Migratsiyalar hozircha Supabase SQL Editor orqali qo‘lda qo‘llangan, shuning uchun Supabase'dagi `supabase_migrations` tarixi bu fayllarni aks ettirmaydi. Batafsil: [`supabase/README.md`](supabase/README.md).
- `supabase/legacy/` — boshqa loyihadan ("Bog‘lanish" katalogi) qolgan eski fayllar. Manbora uchun **qo‘llanmaydi**.
- Asosiy atomik funksiyalar: `handle_new_user`, `purchase_content`, `admin_approve_topup`, `author_create_payout_request`, `admin_approve_payout_paid`, `admin_reject_payout`, `admin_adjust_wallet_balance`, `approve_work_revision`, `approve_chapter_revision` va boshqalar.

## 🛡️ Birinchi administratorni xavfsiz tayinlash

Foydalanuvchilar o‘zlariga o‘zlari admin maqomini bera olmaydi (triggerlar va RLS orqali bloklangan). Birinchi adminni tayinlash faqat auth foydalanuvchisining aniq UUID identifikatori orqali amalga oshiriladi:

1. Foydalanuvchi saytda (`/royxatdan-otish`) yoki Supabase Auth orqali ro‘yxatdan o‘tadi.
2. Supabase SQL Editor orqali quyidagi xavfsiz SQL buyrug‘ini bajaring (UUID ni foydalanuvchining haqiqiy `auth.users.id` qiymati bilan almashtiring):

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
```

---

## ⚙️ Talab qilinadigan muhit o‘zgaruvchilari (Environment Variables)

`.env.local` faylida quyidagi kalitlar o‘rnatilgan bo‘lishi lozim:

```env
# Supabase Client (Public)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Server-Side Service Role Key (Faqat server tomonida - brauzerga hech qachon chiqmasligi shart)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Bank kartalari shifrlash kaliti (AES-256-GCM uchun 32-baytlik kalit)
# Generatsiya qilish: openssl rand -hex 32
CARD_ENCRYPTION_KEY=your_64_hex_character_or_32_byte_secret_here

# Qolganlari (to‘liq ro‘yxat va izohlar — .env.example): ADMIN_EMAILS,
# NEXT_PUBLIC_ADMIN_TELEGRAM_USERNAME, OPENAI_API_KEY (ixtiyoriy, import yordamchisi),
# INDEXNOW_KEY, GOOGLE_SITE_VERIFICATION, YANDEX_SITE_VERIFICATION
```

---

## 🧪 Sinov va tekshiruv buyruqlari

```bash
# Testlarni ishga tushirish (Vitest)
npm run test

# TypeScript tur tekshiruvi
npm run typecheck

# ESLint tekshiruvi
npm run lint

# Ishchi build yaratish
npm run build
```
