# Manbora — O‘zbek kitob va davomli asarlar platformasi (`https://manbora.uz`)

**Manbora** — zamonaviy o‘zbek kitobxonlari va mualliflari platformasi. Mualliflar o‘z kitoblari va davomli (serialized) hikoyalarini nashr etadi, kitobxonlar esa erkin mutolaa qiladi hamda Manbora balansi orqali pullik boblar yoki to‘liq asarlarni xarid qiladi.

Ishlab chiqilgan texnologiyalar: **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Row Level Security (RLS)**, **Vitest**, va **Zod**.

---

## 🌟 Asosiy imkoniyatlar

1. **Kitobxonlar uchun**:
   - Badiiy adabiyot, detektiv, fantastika, romantika, tarixiy va boshqa janrlardagi asarlarni qulay qidirish va saralash.
   - Chalg‘ituvchi elementlarsiz, shrift o‘lchami va intervalini moslash mumkin bo‘lgan mutolaa sahifasi.
   - Qulay hisob to‘ldirish tizimi: tanlangan summa bo‘yicha so‘rov yaratish va Telegram orqali (@diyorbek_anorboyev) chek yuborish.
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

Yangi ma’lumotlar bazasi tuzilmasi `supabase/migrations/011_manbora_platform_core.sql` faylida to‘liq jamlangan.

### Migratsiyani qo‘llash:
1. Supabase Dashboard loyihangizga kiring: [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. **SQL Editor** bo‘limini oching.
3. `supabase/migrations/011_manbora_platform_core.sql` fayli mazmunini nusxalab SQL Editorga joylang va **Run** tugmasini bosing.

Migratsiya quyidagilarni o‘z ichiga oladi:
- 14 ta jadval (`profiles`, `author_profiles`, `genres`, `works`, `work_genres`, `chapters`, `library_items`, `wallet_accounts`, `wallet_transactions`, `purchases`, `topup_requests`, `payout_requests`, `platform_settings`, `admin_audit_logs`).
- Barcha jadvallarda Row Level Security (RLS) siyosatlari.
- Tranzaksiyaviy atomik funksiyalar:
  - `handle_new_user()`
  - `admin_approve_topup(...)`
  - `purchase_content(...)`
  - `author_create_payout_request(...)`
  - `admin_approve_payout_paid(...)`
  - `admin_reject_payout(...)`
- Birlamchi janrlar va platforma sozlamalari (`commission_percentage: 20`, `minimum_payout: 100000`).

---

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
