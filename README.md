# Bog‘lanish — O‘zbekiston Milliy Raqamli Xizmatlar va Aloqa Portali

A verified national digital-services and organization directory for Uzbekistan built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Zod**, and **Vercel**.

Citizens and businesses can find official phone numbers, official websites, state portals, Android/iOS mobile applications, Telegram bots, addresses, and working hours for licensed commercial banks, government ministries, public services, utilities, and telecommunication providers.

---

## 🔐 Diyoration Admin Panel (`/diyoration`) Setup & Security

The website includes a production-grade, light-themed admin panel at `/diyoration`. The public site remains 100% open for visitors without registration.

### Step 1: Database Migration
Execute **[supabase/migrations/004_admin_panel.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/migrations/004_admin_panel.sql)** in your Supabase SQL Editor to create `admin_users` and `admin_audit_logs` tables.

### Step 2: Generate Password Hash
Generate a secure PBKDF2-SHA512 password hash locally using Node.js:

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
```

---

## 🔒 Verification & Official Data Standard

Every record in the directory strictly adheres to primary official source validation:

1. **Licensed Commercial Banks**: Verified directly via the Central Bank of Uzbekistan (CBU) official directory ([https://cbu.uz/en/credit-organizations/banks/](https://cbu.uz/en/credit-organizations/banks/)).
2. **National Government Bodies**: Verified directly via the Government of Uzbekistan official portal ([https://gov.uz/en/all_ministry/1](https://gov.uz/en/all_ministry/1)).
3. **Official Digital Services & Apps**: Verified via official primary organization websites or verified Google Play Store and Apple App Store listings.

---

## 🗄️ Supabase Migrations & Execution Order

1. **[supabase/schema.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/schema.sql)** — Base database schema DDL.
2. **[supabase/migrations/002_digital_services.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/migrations/002_digital_services.sql)** — Digital services schema and source verification fields.
3. **[supabase/migrations/003_verified_banks_schema.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/migrations/003_verified_banks_schema.sql)** — Contact types schema, digital service deduplication & unique constraints.
4. **[supabase/migrations/004_admin_panel.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/migrations/004_admin_panel.sql)** — Diyoration admin panel tables and audit logging.
5. **[supabase/seed_verified_banks.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/seed_verified_banks.sql)** — CBU-verified commercial bank dataset seed.

---

## 🛠️ Local Development & Testing

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
