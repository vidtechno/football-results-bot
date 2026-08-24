# Manbora — O‘zbekiston Tashkilotlari Aloqa Katalogi (`https://manbora.uz`)

**Manbora** — O‘zbekistondagi banklar, davlat tashkilotlari, xizmatlar va ishonch telefonlarini topish uchun qulay va mustaqil katalog platformasi. Built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Zod**, and **Vercel**.

Citizens and businesses can find official phone numbers, official websites, state portals, Android/iOS mobile applications, Telegram bots, addresses, and working hours for licensed commercial banks, government ministries, public services, utilities, and telecommunication providers.

---

## 🌟 Brand Guidelines & Identity

- **Brand Name**: Manbora
- **Primary Domain**: `https://manbora.uz`
- **Short Tagline**: “Kerakli tashkilotni tez toping.”
- **Description**: “Manbora — O‘zbekistondagi banklar, davlat tashkilotlari, xizmatlar va ishonch telefonlarini topish uchun qulay katalog.”
- **Trust Guarantee**: “Ma’lumotlar rasmiy manbalar asosida tekshiriladi.”
- **Disclaimer**: “Manbora mustaqil ma’lumotnoma platformasi. Davlatning rasmiy portali emas.”

---

## 🔐 Diyoration Admin Panel (`/diyoration`) Setup

The website includes a production-grade, light-themed admin panel at `/diyoration`. The public site remains 100% open for visitors without registration.

### Step 1: Execute Database Migrations
Run the SQL migrations in order in your Supabase SQL Editor:
1. `supabase/schema.sql`
2. `supabase/migrations/002_digital_services.sql`
3. `supabase/migrations/003_verified_banks_schema.sql`
4. `supabase/migrations/004_admin_panel.sql`
5. `supabase/migrations/005_directory_engagement.sql`

### Step 2: Generate Password Hash
Generate a secure PBKDF2-SHA512 password hash locally:

```bash
node scripts/generate-password-hash.mjs "Your_Admin_Password_Here"
```

### Step 3: Configure Environment Variables
Set the following environment variables in `.env.local` or Vercel Environment Variables:

```env
ADMIN_USERNAME=diyoration
ADMIN_PASSWORD_HASH=pbkdf2$100000$your_salt_here$your_derived_key_here
ADMIN_SESSION_SECRET=your_long_64_character_random_string_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 🌐 SEO & Indexing Infrastructure

- **Robots**: `robots.ts` dynamically generates `robots.txt` (excludes `/diyoration/` and `/api/`).
- **Sitemap**: `sitemap.ts` dynamically generates `sitemap.xml` for all static and dynamic pages.
- **Canonical URLs**: Built-in canonical metadata with `metadataBase: new URL('https://manbora.uz')`.
- **JSON-LD**:
  - `WebSite` + `SearchAction` JSON-LD on Home Page.
  - `Organization` / `LocalBusiness` JSON-LD on Organization Profile pages.

---

## 🛠️ Local Development & Verification Commands

```bash
# Install dependencies
npm install

# Run Vitest unit tests
npm run test

# Run TypeScript type check
npm run typecheck

# Run ESLint check
npm run lint

# Build production bundle
npm run build
```

---

## 📄 License

ISC License.
