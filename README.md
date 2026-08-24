# Bog‘lanish — O‘zbekistondagi Tashkilotlar Aloqa Ma’lumotlari Portali

A production-ready, mobile-first Uzbek-language public directory website for finding official phone numbers, social media links, websites, addresses, and working hours of organizations in Uzbekistan.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Zod**, and **Vercel**.

---

## 🌟 Key Features

- **Uzbek Latin Interface**: 100% of visible UI text, categories, and region names are in Uzbek Latin (`O‘zbekcha`).
- **Comprehensive Directory**:
  - Banklar va moliya
  - Davlat tashkilotlari (DXA, Soliq, Vazirliklar)
  - Mobil operatorlar (Beeline, Ucell, Mobiuz)
  - Internet provayderlar (Uztelecom, TPS)
  - Yetkazib berish xizmatlari (Express24)
  - Taksi va transport (Yandex Go, MyTaxi)
  - Kommunal xizmatlar (Elektr 1154, Gaz 1104, Suv ta'minoti)
  - Ta’lim va universitetlar (TDTU, SamDU, TTA)
  - Tibbiyot maskanlari va klinikalar
  - Sug‘urta kompaniyalari (Apex, Gross)
  - To‘lov tizimlari (Click, Payme)
  - Onlayn marketpleyslar (Uzum Market)
- **Click-to-Call**: Direct `tel:` links for desktop and mobile devices.
- **Official Verification**: Visual `Rasmiy tasdiqlangan` badge for verified entries.
- **Search & Filters**: Multi-filter search by organization name, category, region/city, phone number, or service type.
- **User Reporting**: “Ma’lumot noto‘g‘ri?” error reporting feature.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript (Strict Mode)
- **Styling**: Tailwind CSS (Trustworthy light mode theme)
- **Database**: Supabase PostgreSQL
- **Validation & Tooling**: Zod, Vitest, ESLint, Prettier

---

## 🗄️ Supabase Database Migration & Setup

### Step 1: Execute Schema Migration
1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and run the contents of [supabase/schema.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/schema.sql).
4. This creates tables for `categories`, `regions`, `organizations`, `organization_contacts`, `organization_social_links`, `organization_locations`, and `organization_reports` along with search indexes and Row Level Security (RLS) policies.

### Step 2: Seed Initial Directory Data
1. In **SQL Editor** -> **New Query**, copy and run the contents of [supabase/seed.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/seed.sql).
2. This inserts 12 categories, 14 Uzbekistan regions, and 25+ realistic demo organizations with contacts, locations, and social media links.

---

## 🛠️ Local Development Setup

### 1. Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Install Dependencies & Run Dev Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Code Quality

Run Vitest unit tests:
```bash
npm run test
```

Run TypeScript type check:
```bash
npm run typecheck
```

Run ESLint check:
```bash
npm run lint
```

Build production bundle:
```bash
npm run build
```

---

## 🚀 Vercel Deployment

Connect your GitHub repository to Vercel. Set the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) in Vercel project settings. Standard Next.js auto-detection will build and deploy the app.

---

## 📄 License

ISC License.
