-- Migration 003: Verified Commercial Banks Schema, Contact Enhancements & Deduplication
-- Migration Date: 2026-08-25

-- 1. ALTER ORGANIZATION_CONTACTS TABLE
ALTER TABLE organization_contacts
  ADD COLUMN IF NOT EXISTS contact_type TEXT DEFAULT 'call_center' CHECK (contact_type IN ('call_center', 'head_office', 'business_support', 'fraud_hotline', 'other')),
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

-- 2. DEDUPLICATE DIGITAL SERVICES TABLE (Retain lowest id per org, service_type, url)
DELETE FROM organization_digital_services a
USING organization_digital_services b
WHERE a.id > b.id
  AND a.organization_id = b.organization_id
  AND LOWER(TRIM(a.service_type)) = LOWER(TRIM(b.service_type))
  AND LOWER(TRIM(a.url)) = LOWER(TRIM(b.url));

-- 3. DEDUPLICATE CONTACTS TABLE (Retain lowest id per org, phone_number)
DELETE FROM organization_contacts a
USING organization_contacts b
WHERE a.id > b.id
  AND a.organization_id = b.organization_id
  AND LOWER(TRIM(a.phone_number)) = LOWER(TRIM(b.phone_number));

-- 4. CREATE UNIQUE CONSTRAINTS TO PREVENT DUPLICATES
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_digital_services 
  ON organization_digital_services (organization_id, LOWER(service_type), LOWER(url));

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contacts 
  ON organization_contacts (organization_id, LOWER(phone_number));
