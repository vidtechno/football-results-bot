-- Migration 009: Insert 10 Verified Uzbekistan Government Organizations
-- Migration Date: 2026-08-25

-- 1. Ensure categories exist
INSERT INTO categories (name, slug, description, sort_order)
VALUES 
  ('Davlat tashkilotlari', 'davlat-tashkilotlari', 'Vazirliklar, davlat qo‘mitalari va idoralari', 2),
  ('Banklar va moliya', 'banklar', 'Tijorat banklari va moliyaviy muassasalar', 1)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert 10 Verified Government Organizations (Idempotent)
INSERT INTO organizations (
  name,
  slug,
  category_id,
  region_id,
  organization_type,
  description,
  website_url,
  source_name,
  source_url,
  is_verified,
  verification_status,
  status,
  last_verified_at,
  created_at,
  updated_at
)
SELECT 
  val.name,
  val.slug,
  c.id AS category_id,
  r.id AS region_id,
  val.organization_type,
  val.description,
  val.website_url,
  val.source_name,
  val.source_url,
  TRUE AS is_verified,
  'verified' AS verification_status,
  'published' AS status,
  NOW() AS last_verified_at,
  NOW() AS created_at,
  NOW() AS updated_at
FROM (
  VALUES
    (
      'O‘zbekiston Respublikasi Raqamli texnologiyalar vazirligi',
      'raqamli-texnologiyalar-vazirligi',
      'davlat-tashkilotlari',
      'government',
      'Raqamli hukumat, IT, telekommunikatsiya va pochta sohasini muvohiqlashtiruvchi davlat organi.',
      'https://gov.uz/digital',
      'Raqamli texnologiyalar vazirligi rasmiy sayti',
      'https://gov.uz/oz/digital/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Soliq qo‘mitasi',
      'soliq-qomitasi',
      'davlat-tashkilotlari',
      'government',
      'Soliq hisobotlari, to‘lovlar, keshbek va soliq qarzdorligi bo‘yicha xizmatlarni yurituvchi davlat organi.',
      'https://gov.uz/soliq',
      'Soliq qo‘mitasi rasmiy sayti',
      'https://gov.uz/oz/soliq/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Ichki ishlar vazirligi',
      'ichki-ishlar-vazirligi',
      'davlat-tashkilotlari',
      'government',
      'Jamoat xavfsizligi, huquqbuzarliklar, pasport va migratsiya masalalari bo‘yicha davlat organi.',
      'https://gov.uz/iiv',
      'Ichki ishlar vazirligi rasmiy sayti',
      'https://gov.uz/oz/iiv/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Adliya vazirligi',
      'adliya-vazirligi',
      'davlat-tashkilotlari',
      'government',
      'Notarial xizmatlar, FHDYO, davlat xizmatlari markazlari va huquqiy maslahatlar bo‘yicha vazirlik.',
      'https://gov.uz/adliya',
      'Adliya vazirligi rasmiy sayti',
      'https://gov.uz/oz/adliya/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Ekologiya va iqlim o‘zgarishi milliy qo‘mitasi',
      'ekologiya-va-iqlim-ozgarishi-milliy-qomitasi',
      'davlat-tashkilotlari',
      'government',
      'Atrof-muhitni muhofaza qilish, chiqindi, daraxt kesilishi va ekologik murojaatlar bo‘yicha davlat organi.',
      'https://gov.uz/eco',
      'Ekologiya qo‘mitasi rasmiy sayti',
      'https://gov.uz/oz/eco/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Transport vazirligi',
      'transport-vazirligi',
      'davlat-tashkilotlari',
      'government',
      'Avtomobil, temir yo‘l, aviatsiya, jamoat transporti va logistika sohasini muvohiqlashtiruvchi vazirlik.',
      'https://gov.uz/mintrans',
      'Transport vazirligi rasmiy sayti',
      'https://gov.uz/oz/mintrans/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Maktabgacha va maktab ta’limi vazirligi',
      'maktabgacha-va-maktab-talimi-vazirligi',
      'davlat-tashkilotlari',
      'government',
      'Maktablar, bog‘chalar, o‘qituvchilar va umumiy ta’lim tizimi bo‘yicha vazirlik.',
      'https://gov.uz/uzedu',
      'Maktabgacha va maktab ta’limi vazirligi rasmiy sayti',
      'https://gov.uz/oz/uzedu/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Oliy ta’lim, fan va innovatsiyalar vazirligi',
      'oliy-talim-fan-va-innovatsiyalar-vazirligi',
      'davlat-tashkilotlari',
      'government',
      'OTMlar, grantlar, talabalar, ilmiy faoliyat va innovatsiyalar bo‘yicha vazirlik.',
      'https://gov.uz/edu',
      'Oliy ta’lim, fan va innovatsiyalar vazirligi rasmiy sayti',
      'https://gov.uz/oz/edu/contacts'
    ),
    (
      'O‘zbekiston Respublikasi Bojxona qo‘mitasi',
      'bojxona-qomitasi',
      'davlat-tashkilotlari',
      'government',
      'Tovarlarni olib kirish-chiqarish, deklaratsiya va bojxona rasmiylashtiruvi bo‘yicha davlat organi.',
      'https://customs.uz',
      'Bojxona qo‘mitasi rasmiy sayti',
      'https://customs.uz/'
    ),
    (
      'O‘zbekiston Respublikasi Markaziy banki',
      'markaziy-bank',
      'banklar',
      'bank',
      'Pul-kredit siyosati, banklar faoliyati va moliyaviy xizmatlar iste’molchilari masalalari bo‘yicha markaziy organ.',
      'https://cbu.uz',
      'O‘zbekiston Respublikasi Markaziy banki rasmiy sayti',
      'https://cbu.uz/en/contacts/'
    )
) AS val(name, slug, cat_slug, organization_type, description, website_url, source_name, source_url)
LEFT JOIN categories c ON c.slug = val.cat_slug
LEFT JOIN regions r ON r.slug = 'toshkent'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  website_url = EXCLUDED.website_url,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  is_verified = TRUE,
  verification_status = 'verified',
  status = 'published',
  last_verified_at = NOW(),
  updated_at = NOW();
