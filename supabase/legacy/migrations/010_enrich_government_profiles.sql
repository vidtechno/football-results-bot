-- Migration 010: Enrich Verified Government Profiles with Apps, Social Links & Services
-- Migration Date: 2026-08-25

-- 1. DEDUPLICATE SOCIAL LINKS INDEX
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_social_links 
  ON organization_social_links (organization_id, LOWER(platform), LOWER(url));

-- 2. DEDUPLICATE DIGITAL SERVICES INDEX
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_digital_services_type_url 
  ON organization_digital_services (organization_id, LOWER(service_type), LOWER(url));

-- 3. ENSURE ALL 10 ORGANIZATIONS ARE PUBLISHED, VERIFIED, AND HAVE RECENT TIMESTAMP
UPDATE organizations
SET 
  is_verified = TRUE,
  verification_status = 'verified',
  status = 'published',
  last_verified_at = NOW(),
  updated_at = NOW()
WHERE slug IN (
  'raqamli-texnologiyalar-vazirligi',
  'soliq-qomitasi',
  'ichki-ishlar-vazirligi',
  'adliya-vazirligi',
  'ekologiya-va-iqlim-ozgarishi-milliy-qomitasi',
  'transport-vazirligi',
  'maktabgacha-va-maktab-talimi-vazirligi',
  'oliy-talim-fan-va-innovatsiyalar-vazirligi',
  'bojxona-qomitasi',
  'markaziy-bank'
);
