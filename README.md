# Futbol Natija — Uzbek Latin Football Results Website

A production-ready, mobile-first Uzbek-language football results website built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **API-Football (API-Sports)**, and **Vercel Cron**.

---

## 🌟 Key Features

- **Uzbek Latin Localization**: All site text, dates, times (`Asia/Tashkent` timezone), and match statuses (`🟢 O‘yin bo‘lmoqda`, `Boshlanmagan`, `Tugadi`, `Qoldirildi`) in Uzbek Latin.
- **Strict Server-Only API-Football Architecture**: The website UI never calls API-Football directly. All data is synchronized to Supabase via server-side cron jobs (`/api/cron/sync-fixtures`).
- **Data-First Serving**: Visitors are served directly from normalized Supabase PostgreSQL tables.
- **No Live Polling**: Match status displays live badges without heavy polling overhead.
- **Top 10 Competitions**:
  1. 🇺🇿 O‘zbekiston Superligasi (League 362)
  2. 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Angliya Premyer-Ligasi (League 39)
  3. 🇪🇸 Ispaniya La Ligasi (League 140)
  4. 🇮🇹 Italiya Serie A-si (League 135)
  5. 🇩🇪 Germaniya Bundesligasi (League 78)
  6. 🇫🇷 Fransiya Ligue 1-i (League 61)
  7. 🇪🇺 UEFA Chempionlar Ligasi (League 2)
  8. 🇪🇺 UEFA Yevropa Ligasi (League 3)
  9. 🇪🇺 UEFA Konferensiyalar Ligasi (League 848)
  10. 🇸🇦 Saudiya Pro-Ligasi (League 307)
- **Local Favorites**: Bookmark favorite competitions and teams locally using `localStorage`.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS + Glassmorphism Dark Theme
- **Database**: Supabase PostgreSQL
- **Data Source**: API-Football (API-Sports)
- **Validation**: Zod
- **Testing & Tooling**: Vitest, ESLint, Prettier

---

## 🛠️ Local Development Setup

### 1. Prerequisites

- Node.js 18+ and npm
- A Supabase account and project
- An API-Football (API-Sports / RapidAPI) API key

### 2. Environment Variables

Create a `.env.local` file in the root directory based on `.env.example`:

```bash
cp .env.example .env.local
```

Fill in your secrets:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

API_FOOTBALL_KEY=your_api_football_key
API_FOOTBALL_BASE_URL=https://v3.football.api-sports.io

CRON_SECRET=your_cron_secret_token
```

### 3. Supabase Database Setup

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> **New Query**.
3. Copy and execute the SQL migration script from `supabase/schema.sql`.
4. This creates tables for `competitions`, `teams`, `fixtures`, and `api_sync_state` with index optimizations and RLS policies.

### 4. Install Dependencies & Run Dev Server

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 Triggering Manual Data Sync

To manually trigger fixture sync from API-Football into Supabase for today and tomorrow:

```bash
curl -X GET "http://localhost:3000/api/cron/sync-fixtures?secret=your_cron_secret_token"
```

Or using an Authorization header:

```bash
curl -H "Authorization: Bearer your_cron_secret_token" http://localhost:3000/api/cron/sync-fixtures
```

---

## 🚀 Vercel Deployment & Vercel Cron Setup

### 1. Deploy to Vercel

1. Push your code to GitHub.
2. Connect your GitHub repository to [Vercel](https://vercel.com).
3. Set the Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `API_FOOTBALL_KEY`, `CRON_SECRET`) in Vercel Project Settings.

### 2. Vercel Cron Automatic Setup

The repository includes a `vercel.json` configured with:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-fixtures",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

Vercel automatically provisions and invokes `/api/cron/sync-fixtures` every 6 hours and attaches the `CRON_SECRET` header.

---

## 🧪 Testing, Linting & Build Checks

Run unit tests:
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

Format check:
```bash
npm run format:check
```

Production build test:
```bash
npm run build
```

---

## 📄 License

ISC License.
