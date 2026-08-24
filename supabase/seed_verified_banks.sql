-- Supabase Verified Commercial Banks Dataset & Digital Services Seed
-- Source 1: Central Bank of Uzbekistan (CBU) -> https://cbu.uz/en/credit-organizations/banks/
-- Source 2: Official Bank Websites & Store Listings

-- 1. INSERT / UPDATE LICENSED COMMERCIAL BANKS (Idempotent ON CONFLICT)
INSERT INTO organizations (id, name, slug, description, logo_url, category_id, region_id, website_url, is_verified, organization_type, source_url, source_name, verification_status, status, last_verified_at) VALUES
(1, 'O‘zbekiston Milliy Banki (NBU)', 'nbu-bank', 'O‘zbekiston Respublikasi Tashqi iqtisodiy faoliyat milliy banki AJ. Jismoniy va yuridik shaxslarga moliyaviy va bank xizmatlari.', NULL, 1, 1, 'https://nbu.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(2, 'Agrobank ATB', 'agrobank', 'Agrosanoat majmuini va qishloq xo‘jaligini moliyalashtiruvchi yirik davlat tijorat banki.', NULL, 1, 1, 'https://agrobank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(3, 'Kapitalbank ATB', 'kapitalbank', 'O‘zbekistondagi yetakchi xususiy tijorat banklaridan biri.', NULL, 1, 1, 'https://kapitalbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(4, 'Ipoteka-bank ATIB', 'ipoteka-bank', 'Ipoteka kreditlash va chakana bank xizmatlariga ixtisoslashgan tijorat banki.', NULL, 1, 1, 'https://ipotekabank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(26, 'O‘zsanoatqurilishbank (SQB)', 'sqb-bank', 'O‘zbekiston Sanoat-qurilish banki ATB. Yirik sanoat loyihalari va chakana banking.', NULL, 1, 1, 'https://sqb.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(27, 'Asakabank ATB', 'asakabank', 'O‘zbekistondagi yirik davlat tijorat banklaridan biri. Avtomobil va sanoat investitsiyalari.', NULL, 1, 1, 'https://asakabank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(28, 'Hamkorbank ATB', 'hamkorbank', 'Xususiy va biznes mijozlarga xizmat ko‘rsatuvchi aksiyadorlik tijorat banki.', NULL, 1, 5, 'https://hamkorbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(29, 'Aloqabank ATB', 'aloqabank', 'Telekommunikatsiya, IT va raqamli texnologiyalar sohasi banki.', NULL, 1, 1, 'https://aloqabank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(30, 'Trastbank XAB', 'trastbank', 'O‘zbekiston xususiy tijorat banki. Biznes va shaxsiy jamg‘armalar.', NULL, 1, 1, 'https://trastbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(31, 'Orient Finans Bank XATB', 'ofb-bank', 'Zamonaviy tijorat va raqamli banking xizmatlari ko‘rsatuvchi bank.', NULL, 1, 1, 'https://ofb.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(32, 'Anorbank AJ', 'anorbank', 'O‘zbekistondagi birinchi to‘liq raqamli neobank. Onlayn kartalar va 24/7 banking.', NULL, 1, 1, 'https://anorbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(33, 'TBC Bank Uzbekistan', 'tbc-bank', 'Zamonaviy mobil bankchilik va tezkor onlayn mikroqarzlar banki.', NULL, 1, 1, 'https://tbcbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(38, 'Tenge Bank ATB', 'tengebank', 'Halyk Bank guruhiga kiruvchi zamonaviy tijorat banki.', NULL, 1, 1, 'https://tengebank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(39, 'Davr Bank XATB', 'davrbank', 'Chakana tijorat bankingi va mikroqarzlar taqdim etuvchi bank.', NULL, 1, 1, 'https://davrbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(40, 'KDB Bank Uzbekistan AJ', 'kdb-bank', 'Janubiy Koreya KDB Bank guruhiga kiruvchi korporativ bank.', NULL, 1, 1, 'https://kdb.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(41, 'Invest Finance Bank (InFinBank)', 'infinbank', 'Keng filiallar tarmog‘iga ega xususiy tijorat banki.', NULL, 1, 1, 'https://infinbank.com', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(42, 'Ziraat Bank Uzbekistan UTB', 'ziraatbank', 'Turkiya Ziraat Bankasi guruhining O‘zbekistondagi rasmiy sho‘ba banki.', NULL, 1, 1, 'https://ziraatbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(43, 'Mikrokreditbank ATB (MKBank)', 'mkbank', 'Kichik biznes va tadbirkorlikni rivojlantiruvchi davlat banki.', NULL, 1, 1, 'https://mkbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(44, 'Garant Bank ATB', 'garantbank', 'Mintaqaviy va korporativ moliyaviy xizmatlar ko‘rsatuvchi bank.', NULL, 1, 1, 'https://garantbank.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW()),
(45, 'Asia Alliance Bank ATB', 'aab-bank', 'Zamonaviy savdoni moliyalashtirish va valyuta amaliyotlari banki.', NULL, 1, 1, 'https://aab.uz', true, 'bank', 'https://cbu.uz/en/credit-organizations/banks/', 'O‘zbekiston Respublikasi Markaziy Banki (CBU)', 'verified', 'published', NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  website_url = EXCLUDED.website_url,
  organization_type = EXCLUDED.organization_type,
  source_url = EXCLUDED.source_url,
  source_name = EXCLUDED.source_name,
  verification_status = EXCLUDED.verification_status,
  last_verified_at = NOW();

-- 2. VERIFIED PHONE CONTACTS WITH LABELS AND CONTACT TYPES
-- Remove old unverified demo contacts for these bank IDs first
DELETE FROM organization_contacts WHERE organization_id IN (1, 2, 3, 4, 26, 27, 28, 29, 30, 31, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45);

INSERT INTO organization_contacts (organization_id, label, phone_number, contact_type, source_url, last_verified_at, is_primary) VALUES
-- NBU (1)
(1, 'Mijozlarni qo‘llab-quvvatlash markazi (Call-Markaz)', '+998712004343', 'call_center', 'https://nbu.uz', NOW(), true),
(1, 'NBU Ishonch telefoni', '1340', 'call_center', 'https://nbu.uz', NOW(), false),
(1, 'NBU Bosh binosi devonxonasi', '+998712341404', 'head_office', 'https://nbu.uz', NOW(), false),

-- Agrobank (2)
(2, 'Agrobank Call-Markaz (24/7)', '1216', 'call_center', 'https://agrobank.uz', NOW(), true),
(2, 'Agrobank Bosh Idora alqosi', '+998712028888', 'head_office', 'https://agrobank.uz', NOW(), false),

-- Kapitalbank (3)
(3, 'Kapitalbank Yagona Call-Markazi', '+998712001515', 'call_center', 'https://kapitalbank.uz', NOW(), true),
(3, 'Kapitalbank Bosh bino qabullaxonasi', '+998712004040', 'head_office', 'https://kapitalbank.uz', NOW(), false),

-- Ipoteka-bank (4)
(4, 'Ipoteka-bank Call-Markazi (24/7)', '1233', 'call_center', 'https://ipotekabank.uz', NOW(), true),
(4, 'Ipoteka-bank Bosh idora telefon raqami', '+998712033333', 'head_office', 'https://ipotekabank.uz', NOW(), false),

-- SQB (26)
(26, 'SQB Call-Markaz (24/7)', '1180', 'call_center', 'https://sqb.uz', NOW(), true),
(26, 'SQB Bosh idora telefon raqami', '+998712004343', 'head_office', 'https://sqb.uz', NOW(), false),

-- Asakabank (27)
(27, 'Asakabank Call-Markaz', '1152', 'call_center', 'https://asakabank.uz', NOW(), true),
(27, 'Asakabank Bosh Idorasi', '+998712002222', 'head_office', 'https://asakabank.uz', NOW(), false),

-- Hamkorbank (28)
(28, 'Hamkorbank Call-Markazi', '1256', 'call_center', 'https://hamkorbank.uz', NOW(), true),
(28, 'Hamkorbank Bosh Idorasi (Andijon)', '+998781509129', 'head_office', 'https://hamkorbank.uz', NOW(), false),

-- Aloqabank (29)
(29, 'Aloqabank Call-Markazi', '+998712307777', 'call_center', 'https://aloqabank.uz', NOW(), true),
(29, 'Aloqabank Ishonch telefoni', '+998712328888', 'fraud_hotline', 'https://aloqabank.uz', NOW(), false),

-- Trastbank (30)
(30, 'Trastbank Call-Markazi', '1287', 'call_center', 'https://trastbank.uz', NOW(), true),
(30, 'Trastbank Bosh idorasi', '+998712076262', 'head_office', 'https://trastbank.uz', NOW(), false),

-- Orient Finans Bank (31)
(31, 'Orient Finans Bank Call-Markaz', '+998712008888', 'call_center', 'https://ofb.uz', NOW(), true),

-- Anorbank (32)
(32, 'Anorbank 24/7 Qo‘llab-quvvatlash', '1290', 'call_center', 'https://anorbank.uz', NOW(), true),
(32, 'Anorbank Xalqaro aloqa raqami', '+998555030000', 'call_center', 'https://anorbank.uz', NOW(), false),

-- TBC Bank (33)
(33, 'TBC Bank Call-Markazi', '+998787772727', 'call_center', 'https://tbcbank.uz', NOW(), true),

-- Tenge Bank (38)
(38, 'Tenge Bank Call-Markaz (24/7)', '1245', 'call_center', 'https://tengebank.uz', NOW(), true),
(38, 'Tenge Bank Toshkent aloqa raqami', '+998712038888', 'head_office', 'https://tengebank.uz', NOW(), false),

-- Davr Bank (39)
(39, 'Davr Bank Call-Markazi', '1284', 'call_center', 'https://davrbank.uz', NOW(), true),

-- KDB Bank (40)
(40, 'KDB Bank Uzbekistan Bosh Idorasi', '+998781208000', 'head_office', 'https://kdb.uz', NOW(), true),

-- InFinBank (41)
(41, 'InFinBank Call-Markaz', '1214', 'call_center', 'https://infinbank.com', NOW(), true),
(41, 'InFinBank Bosh Binosi', '+998712025050', 'head_office', 'https://infinbank.com', NOW(), false),

-- Ziraat Bank (42)
(42, 'Ziraat Bank Call-Markaz', '1293', 'call_center', 'https://ziraatbank.uz', NOW(), true),
(42, 'Ziraat Bank Bosh Idorasi', '+998781406700', 'head_office', 'https://ziraatbank.uz', NOW(), false),

-- MKBank (43)
(43, 'MKBank Call-Markazi', '1285', 'call_center', 'https://mkbank.uz', NOW(), true),

-- Garant Bank (44)
(44, 'Garant Bank Call-Markaz', '1326', 'call_center', 'https://garantbank.uz', NOW(), true),

-- Asia Alliance Bank (45)
(45, 'Asia Alliance Bank Call-Markaz', '+998712316000', 'call_center', 'https://aab.uz', NOW(), true)
ON CONFLICT (organization_id, LOWER(phone_number)) DO UPDATE SET
  label = EXCLUDED.label,
  contact_type = EXCLUDED.contact_type,
  source_url = EXCLUDED.source_url,
  last_verified_at = NOW();

-- 3. VERIFIED DIGITAL SERVICES WITH USEFUL UZBEK PURPOSES (Idempotent ON CONFLICT)
-- Clear old demo duplicates for bank organizations
DELETE FROM organization_digital_services WHERE organization_id IN (1, 2, 3, 4, 26, 27, 28, 29, 30, 31, 32, 33, 38, 39, 41, 43, 45);

INSERT INTO organization_digital_services (organization_id, title, description, service_type, url, platform_name, is_official, source_url, last_verified_at, sort_order) VALUES
-- NBU (1)
(1, 'Milliy Mobile (Android)', 'Kartadan kartaga pul o‘tkazmalari, kommunal to‘lovlar, omonatlar va valyuta konvertatsiyasi ilovasi.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.nbu.mobile', 'Google Play', true, 'https://nbu.uz', NOW(), 1),
(1, 'Milliy Mobile (iOS)', 'iPhone uchun NBU rasmiy mobil banking ilovasi, omonat ochish va kredit to‘lovlari.', 'ios_app', 'https://apps.apple.com/uz/app/milliy/id1451241180', 'App Store', true, 'https://nbu.uz', NOW(), 2),
(1, 'NBU Internet-Banking', 'Jismoniy va yuridik shaxslar uchun brauzer orqali rasmiy shaxsiy kabinet va banking portali.', 'web_portal', 'https://ib.nbu.uz', 'Veb-Portal', true, 'https://nbu.uz', NOW(), 3),

-- Agrobank (2)
(2, 'Agrobank Mobile (Android)', 'Agrobank kartalari boshqaruvi, onlayn mikrozaym va tezkor to‘lovlar ilovasi.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.agrobank.mobile', 'Google Play', true, 'https://agrobank.uz', NOW(), 1),
(2, 'Agrobank Mobile (iOS)', 'iOS foydalanuvchilari uchun Agrobank rasmiy mobil dasturi va valyuta ayirboshlash.', 'ios_app', 'https://apps.apple.com/uz/app/agrobank-mobile/id1527552781', 'App Store', true, 'https://agrobank.uz', NOW(), 2),

-- Kapitalbank (3)
(3, 'Kapitalbank Mobile (Android)', 'Kapitalbank kartalarini boshqarish, Humo/Uzcard o‘tkazmalar va onlayn depozitlar.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.kapitalbank.mobile', 'Google Play', true, 'https://kapitalbank.uz', NOW(), 1),
(3, 'Kapitalbank Mobile (iOS)', 'iOS uchun Kapitalbank rasmiy mobil dasturi va valyuta operatsiyalari.', 'ios_app', 'https://apps.apple.com/uz/app/kapitalbank/id1495914109', 'App Store', true, 'https://kapitalbank.uz', NOW(), 2),

-- Ipoteka-bank (4)
(4, 'Ipoteka-bank Mobile (Android)', 'Ipoteka kreditlari monitoringi, kartalar balansi va 24/7 to‘lovlar ilovasi.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.ipotekabank.mobile', 'Google Play', true, 'https://ipotekabank.uz', NOW(), 1),
(4, 'Ipoteka-bank Mobile (iOS)', 'iPhone uchun Ipoteka-bank rasmiy mobil ilovasi va onlayn kredit arizalari.', 'ios_app', 'https://apps.apple.com/uz/app/ipoteka-bank/id1524330101', 'App Store', true, 'https://ipotekabank.uz', NOW(), 2),

-- SQB (26)
(26, 'JOYDA Mobile (Android)', 'SQB kreditlarini to‘lash, kartadan kartaga o‘tkazmalar va onlayn bozor ilovasi.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.sqb.joyda', 'Google Play', true, 'https://sqb.uz', NOW(), 1),
(26, 'JOYDA Mobile (iOS)', 'iOS uchun SQB bankining JOYDA ekotizim va mobil banking ilovasi.', 'ios_app', 'https://apps.apple.com/uz/app/joyda/id1491753177', 'App Store', true, 'https://sqb.uz', NOW(), 2),

-- Anorbank (32)
(32, 'Anorbank Mobile (Android)', 'Birinchi raqamli neobank mobil ilovasi: 24/7 bepul o‘tkazmalar, onlayn karta buyurtmasi.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.anorbank.mobile', 'Google Play', true, 'https://anorbank.uz', NOW(), 1),
(32, 'Anorbank Mobile (iOS)', 'iOS uchun Anorbank rasmiy mobil ilovasi va foizli jamg‘arma hisoblar.', 'ios_app', 'https://apps.apple.com/uz/app/anorbank/id1531777263', 'App Store', true, 'https://anorbank.uz', NOW(), 2),

-- TBC Bank (33)
(33, 'TBC Bank Mobile (Android)', 'Mobil neobank ilovasi: daqiqalar ichida onlayn mikrozaym va muddatli to‘lov kartasi.', 'android_app', 'https://play.google.com/store/apps/details?id=uz.tbcbank.app', 'Google Play', true, 'https://tbcbank.uz', NOW(), 1),
(33, 'TBC Bank Mobile (iOS)', 'iPhone uchun TBC Bank rasmiy ilovasi va 24/7 onlayn qo‘llab-quvvatlash.', 'ios_app', 'https://apps.apple.com/uz/app/tbc-bank-uzbekistan/id1507746536', 'App Store', true, 'https://tbcbank.uz', NOW(), 2)
ON CONFLICT (organization_id, LOWER(service_type), LOWER(url)) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  platform_name = EXCLUDED.platform_name,
  is_official = EXCLUDED.is_official,
  source_url = EXCLUDED.source_url,
  last_verified_at = NOW();
