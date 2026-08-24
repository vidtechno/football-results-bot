# Bog‘lanish — O‘zbekiston Milliy Raqamli Xizmatlar va Aloqa Portali

A verified national digital-services and organization directory for Uzbekistan built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, **Zod**, and **Vercel**.

Citizens and businesses can find official phone numbers, official websites, state portals, Android/iOS mobile applications, Telegram bots, addresses, and working hours for licensed commercial banks, government ministries, public services, utilities, and telecommunication providers.

---

## 🔒 Verification & Official Data Standard

Every record in the directory strictly adheres to primary official source validation:

1. **Licensed Commercial Banks**: Verified directly via the Central Bank of Uzbekistan (CBU) official directory ([https://cbu.uz/en/credit-organizations/banks/](https://cbu.uz/en/credit-organizations/banks/)).
2. **National Government Bodies**: Verified directly via the Government of Uzbekistan official portal ([https://gov.uz/en/all_ministry/1](https://gov.uz/en/all_ministry/1) & [https://gov.uz/en/all_ministry/4](https://gov.uz/en/all_ministry/4)).
3. **Official Digital Services & Apps**: Verified via official primary organization websites or verified Google Play Store and Apple App Store listings.

Every record tracks:
- `source_url`
- `source_name`
- `verification_status` (`verified` | `pending_review` | `unverified`)
- `last_verified_at`

---

## 🗄️ Supabase Database Migration & Setup

### Step 1: Base Schema DDL
Execute [supabase/schema.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/schema.sql) in your Supabase SQL Editor.

### Step 2: Digital Services Migration
Execute [supabase/migrations/002_digital_services.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/migrations/002_digital_services.sql) to add `organization_digital_services` table and source metadata fields (`organization_type`, `source_url`, `source_name`, `verification_status`, `last_verified_at`).

### Step 3: Verified Seed Execution
Execute [supabase/seed_verified_national.sql](file:///Users/abdulaziz/Desktop/futbol%20natija/supabase/seed_verified_national.sql) to populate CBU-verified commercial banks, GOV.UZ-verified government bodies, and official digital service apps.

---

## 📋 Periodic Verification & Administrative Workflow

To maintain dataset integrity over time:
1. **Periodic CBU Audit (Quarterly)**: Re-check CBU commercial bank listings to update new licenses or contact changes.
2. **Periodic GOV.UZ Audit (Semi-Annually)**: Re-check government portal reorganizations or new state service portals.
3. **User Error Reports**: Review user-submitted reports from the `organization_reports` table via Supabase dashboard or custom admin panel, verifying updates against official primary source URLs before updating `verification_status` to `'verified'`.

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
