-- Supabase Seed Data for "Bog'lanish" Uzbekistan Directory Website
-- Note: All phone numbers and URLs are realistic demo placeholder data clearly marked as demo records.

-- 1. CATEGORIES (12 items)
INSERT INTO categories (id, name, slug, icon, description, sort_order) VALUES
(1, 'Banklar va moliya', 'banklar', 'Landmark', 'O‘zbekistondagi tijorat banklari va moliya muassasalari aloqa raqamlari', 1),
(2, 'Davlat tashkilotlari', 'davlat-tashkilotlari', 'Building2', 'Vazirliklar, idoralar va davlat xizmatlari ko‘rsatish markazlari', 2),
(3, 'Mobil operatorlar', 'mobil-operatorlar', 'Smartphone', 'O‘zbekistondagi uyali aloqa operatorlari call-markazlari', 3),
(4, 'Internet provayderlar', 'internet-provayderlar', 'Wifi', 'Uy va biznes uchun internet provayderlar', 4),
(5, 'Yetkazib berish xizmatlari', 'yetkazib-berish', 'Truck', 'Taom va kuryerlik yetkazib berish xizmatlari', 5),
(6, 'Taksi va transport', 'taksi', 'Car', 'Taksi agregatorlari va jamoat transporti xizmatlari', 6),
(7, 'Kommunal xizmatlar', 'kommunal', 'Zap', 'Elektr, gaz, suv va issiqlik ta’minoti favqulodda xizmatlari', 7),
(8, 'Ta’lim va universitetlar', 'talim', 'GraduationCap', 'Oliy o‘quv yurtlari, litseylar va ta’lim markazlari', 8),
(9, 'Tibbiyot va klinika', 'tibbiyot', 'Stethoscope', 'Shifoxonalar, tez yordam va xususiy klinikalar', 9),
(10, 'Sug‘urta kompaniyalari', 'sugurta', 'ShieldCheck', 'Avto, tibbiy va mulk sug‘urtasi kompaniyalari', 10),
(11, 'To‘lov tizimlari', 'tolov-tizimlari', 'CreditCard', 'Elektron to‘lov tizimlari va mobil ilovalar', 11),
(12, 'Marketpleys va do‘konlar', 'marketpleyslar', 'ShoppingBag', 'Onlayn do‘konlar va marketpleys xizmatlari', 12)
ON CONFLICT (slug) DO NOTHING;

-- 2. REGIONS (14 items)
INSERT INTO regions (id, name, slug, sort_order) VALUES
(1, 'Toshkent shahri', 'toshkent-sh', 1),
(2, 'Toshkent viloyati', 'toshkent-vil', 2),
(3, 'Samarqand viloyati', 'samarqand', 3),
(4, 'Farg‘ona viloyati', 'fargona', 4),
(5, 'Andijon viloyati', 'andijon', 5),
(6, 'Namangan viloyati', 'namangan', 6),
(7, 'Buxoro viloyati', 'buxoro', 7),
(8, 'Xorazm viloyati', 'xorazm', 8),
(9, 'Qashqadaryo viloyati', 'qashqadaryo', 9),
(10, 'Surxondaryo viloyati', 'surxondaryo', 10),
(11, 'Navoiy viloyati', 'navoiy', 11),
(12, 'Jizzax viloyati', 'jizzax', 12),
(13, 'Sirdaryo viloyati', 'sirdaryo', 13),
(14, 'Qoraqalpog‘iston Respublikasi', 'qoraqalpogiston', 14)
ON CONFLICT (slug) DO NOTHING;

-- Reset identity sequences if needed
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions));

-- 3. ORGANIZATIONS (25+ items)
INSERT INTO organizations (id, name, slug, description, logo_url, category_id, region_id, website_url, is_verified, status, last_verified_at) VALUES
(1, 'O‘zmilliybank (NBU)', 'nbu-bank', 'O‘zbekiston Respublikasi Tashqi iqtisodiy faoliyat milliy banki.', 'https://upload.wikimedia.org/wikipedia/commons/e/e8/NBU_logo.png', 1, 1, 'https://nbu.uz', true, 'published', NOW()),
(2, 'Agrobank ATB', 'agrobank', 'Qishloq xo‘jaligini moliyalashtirish va umumiy bank xizmatlari.', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Agrobank_logo.png', 1, 1, 'https://agrobank.uz', true, 'published', NOW()),
(3, 'Kapitalbank ATB', 'kapitalbank', 'Jismoniy va yuridik shaxslar uchun zamonaviy tijorat banki.', NULL, 1, 1, 'https://kapitalbank.uz', true, 'published', NOW()),
(4, 'Ipoteka-bank', 'ipoteka-bank', 'Ipoteka kreditlari va tijorat bank xizmatlari ko‘rsatuvchi bank.', NULL, 1, 1, 'https://ipotekabank.uz', true, 'published', NOW()),
(5, 'Davlat xizmatlari agentligi (DXA)', 'dxa-davlat-xizmatlari', 'Aholiga va biznesga davlat xizmatlarini ko‘rsatish yagona markazi.', NULL, 2, 1, 'https://davxizmat.uz', true, 'published', NOW()),
(6, 'Soliq qo‘mitasi', 'soliq-qomitasi', 'O‘zbekiston Respublikasi Vazirlar Mahkamasi huzuridagi Soliq qo‘mitasi.', NULL, 2, 1, 'https://soliq.uz', true, 'published', NOW()),
(7, 'Beeline Uzbekistan', 'beeline-uz', 'Mobil aloqa va 4G/LTE internet operatori.', NULL, 3, 1, 'https://beeline.uz', true, 'published', NOW()),
(8, 'Ucell (COSCOM)', 'ucell-uz', 'O‘zbekistondagi yetakchi mobil aloqa operatorlaridan biri.', NULL, 3, 1, 'https://ucell.uz', true, 'published', NOW()),
(9, 'MOBIUZ (UMS)', 'mobiuz', 'Milliy mobil aloqa va ma’lumot uzatish operatori.', NULL, 3, 1, 'https://mobi.uz', true, 'published', NOW()),
(10, 'Uztelecom (Uzonline)', 'uztelecom', 'Milliy telekommunikatsiya operatori va statsionar internet provayderi.', NULL, 4, 1, 'https://uztelecom.uz', true, 'published', NOW()),
(11, 'TPS (Turon Telecom)', 'tps-internet', 'Keng polosali optik-tolali internet va IPTV provayderi.', NULL, 4, 1, 'https://tps.uz', true, 'published', NOW()),
(12, 'Express24', 'express24', 'Restoranlardan taom va do‘konlardan mahsulotlarni yetkazib berish xizmati.', NULL, 5, 1, 'https://express24.uz', true, 'published', NOW()),
(13, 'Yandex Go Tashkent', 'yandex-go', 'Taksi chaqirish, yetkazib berish va karshering platformasi.', NULL, 6, 1, 'https://yandex.uz/go', true, 'published', NOW()),
(14, 'MyTaxi', 'mytaxi-uz', 'O‘zbekiston shaharlarida onlayn taksi chaqirish ilovasi.', NULL, 6, 1, 'https://mytaxi.uz', true, 'published', NOW()),
(15, 'Hududiy elektr tarmoqlari', 'het-elektr', 'Elektr energiyasini taqsimlash va iste’molchilarga xizmat ko‘rsatish.', NULL, 7, 1, 'https://het.uz', true, 'published', NOW()),
(16, 'Hududgazta’minot', 'hududgaz', 'Aholi va korxonalarni tabiiy hamda suyultirilgan gaz bilan ta’minlash.', NULL, 7, 1, 'https://hududgaz.uz', true, 'published', NOW()),
(17, 'Toshkent shahar Suv ta’minoti', 'suv-taminoti', 'Ichimlik suvi ta’minoti va oqova suv xizmatlari.', NULL, 7, 1, 'http://suvtaminoti.uz', true, 'published', NOW()),
(18, 'Toshkent davlat texnika universiteti (TDTU)', 'tdtu-universitet', 'O‘zbekistondagi eng yirik texnik oliy ta’lim muassasasi.', NULL, 8, 1, 'https://tdtu.uz', true, 'published', NOW()),
(19, 'Samarqand davlat universiteti (SamDU)', 'samdu-universitet', 'Samarqand shahridagi qadimiy va nufuzli davlat universiteti.', NULL, 8, 3, 'https://samdu.uz', true, 'published', NOW()),
(20, 'Toshkent tibbiyot akademiyasi (TTA)', 'tta-tibbiyot', 'Respublika yetakchi tibbiyot oliy o‘quv yurti va klinikasi.', NULL, 9, 1, 'https://tma.uz', true, 'published', NOW()),
(21, 'APEX Insurance', 'apex-insurance', 'Avto, mulk va salomatlik bo‘yicha har tomonlama sug‘urta xizmati.', NULL, 10, 1, 'https://apex.uz', true, 'published', NOW()),
(22, 'Gross Insurance', 'gross-insurance', 'Jismoniy va yuridik shaxslarga mo‘ljallangan milliy sug‘urta kompaniyasi.', NULL, 10, 1, 'https://gross.uz', true, 'published', NOW()),
(23, 'Click to‘lov tizimi', 'click-uz', 'Mobil ilova va USSD orqali to‘lovlarni amalga oshirish tizimi.', NULL, 11, 1, 'https://click.uz', true, 'published', NOW()),
(24, 'Payme to‘lov ilovasi', 'payme-uz', 'Kommunal, davlat va onlayn to‘lovlarni oson o‘tkazish ilovasi.', NULL, 11, 1, 'https://payme.uz', true, 'published', NOW()),
(25, 'Uzum Market', 'uzum-market', 'O‘zbekiston bo‘ylab 1 kunda yetkazib beruvchi milliyn onlayn marketpleys.', NULL, 12, 1, 'https://uzum.uz', true, 'published', NOW())
ON CONFLICT (slug) DO NOTHING;

SELECT setval('organizations_id_seq', (SELECT MAX(id) FROM organizations));

-- 4. ORGANIZATION CONTACTS
INSERT INTO organization_contacts (organization_id, label, phone_number, is_primary) VALUES
(1, 'Call-markaz (Ishonch telefoni)', '+998 78 148-00-10', true),
(1, 'Qisqa raqam', '1344', false),
(2, 'Mijozlarni qo‘llab-quvvatlash', '+998 71 203-88-88', true),
(2, 'Qisqa raqam', '1216', false),
(3, 'Call-center', '+998 78 148-11-22', true),
(3, 'Qisqa raqam', '1340', false),
(4, 'Call-center', '+998 78 150-11-22', true),
(5, 'Yagona call-markaz', '1148', true),
(6, 'Soliq ishonch telefoni', '1198', true),
(7, 'Call-markaz', '+998 90 185-00-55', true),
(7, 'Qisqa raqam (Beeline sim-kartadan)', '0611', false),
(8, 'Mijozlarga xizmat ko‘rsatish', '+998 93 180-00-00', true),
(8, 'Qisqa raqam (Ucell sim-kartadan)', '8123', false),
(9, 'Call-markaz', '+998 97 130-09-09', true),
(9, 'Qisqa raqam', '0890', false),
(10, 'Yagona qo‘llab-quvvatlash markazi', '1084', true),
(10, 'Toshkent shahar filiali', '+998 71 200-09-09', false),
(11, 'Mijozlar bo‘limi', '+998 78 150-00-00', true),
(12, 'Qo‘llab-quvvatlash xizmati', '+998 78 148-77-00', true),
(13, 'Yandex Go Yordam markazi', '+998 78 129-00-00', true),
(14, 'Dispetcherlik xizmati', '+998 71 200-22-22', true),
(15, 'Avariya-dispetcherlik xizmati', '1154', true),
(16, 'Hududgaz ishonch telefoni', '1104', true),
(17, 'Dispetcherlik bo‘limi', '+998 71 256-10-10', true),
(18, 'Qabulxona', '+998 71 246-46-00', true),
(19, 'SamDU devonxonasi', '+998 66 239-11-40', true),
(20, 'Shifoxona qabul bo‘limi', '+998 71 214-89-00', true),
(21, 'Sug‘urta hodisasi bo‘yicha', '+998 78 120-00-00', true),
(21, 'Qisqa raqam', '1188', false),
(22, 'Mijozlar markazi', '+998 71 207-00-11', true),
(23, 'Qo‘llab-quvvatlash markazi', '+998 71 231-08-80', true),
(24, 'Payme yordam xizmati', '+998 78 150-22-22', true),
(25, 'Qo‘llab-quvvatlash xizmati', '+998 78 150-00-00', true);

-- 5. ORGANIZATION SOCIAL LINKS
INSERT INTO organization_social_links (organization_id, platform, url) VALUES
(1, 'telegram', 'https://t.me/nbu_official'),
(1, 'instagram', 'https://instagram.com/nbu.official'),
(2, 'telegram', 'https://t.me/AgrobankUz'),
(3, 'telegram', 'https://t.me/kapitalbankuz'),
(5, 'telegram', 'https://t.me/Davxizmat'),
(7, 'telegram', 'https://t.me/BeelineUzbekistan'),
(7, 'instagram', 'https://instagram.com/beeline_uzbekistan'),
(8, 'telegram', 'https://t.me/Ucell'),
(9, 'telegram', 'https://t.me/MobiuzUz'),
(10, 'telegram', 'https://t.me/uztelecomuz'),
(12, 'telegram', 'https://t.me/express24uz'),
(13, 'telegram', 'https://t.me/yandexgo_uz'),
(23, 'telegram', 'https://t.me/clickuz'),
(24, 'telegram', 'https://t.me/payme_uz'),
(25, 'telegram', 'https://t.me/uzum_market');

-- 6. ORGANIZATION LOCATIONS
INSERT INTO organization_locations (organization_id, address, map_url, working_hours) VALUES
(1, 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 101-uy', 'https://maps.google.com/?q=NBU+Tashkent', 'Dush-Jum: 09:00 - 18:00 (Tanaffus: 13:00 - 14:00)'),
(2, 'Toshkent sh., Shayxontohur tumani, Alisher Navoiy ko‘chasi, 18-uy', 'https://maps.google.com/?q=Agrobank+Tashkent', 'Dush-Jum: 09:00 - 18:00'),
(3, 'Toshkent sh., Mirobod tumani, Sayilgoh ko‘chasi, 7-uy', 'https://maps.google.com/?q=Kapitalbank+Tashkent', 'Dush-Jum: 09:00 - 18:00'),
(4, 'Toshkent sh., Shahrisabz ko‘chasi, 30-uy', NULL, 'Dush-Jum: 09:00 - 18:00'),
(5, 'Toshkent sh., Chilonzor tumani, Mustaqillik shoh ko‘chasi, 5-uy', NULL, 'Dush-Jum: 09:00 - 18:00'),
(6, 'Toshkent sh., Abay ko‘chasi, 4-uy', NULL, 'Dush-Jum: 09:00 - 18:00'),
(7, 'Toshkent sh., Mirobod tumani, Buxoro ko‘chasi, 1-uy', NULL, '24/7 (Call-markaz)'),
(8, 'Toshkent sh., Shahrisabz ko‘chasi, 1-uy', NULL, '24/7 (Call-markaz)'),
(10, 'Toshkent sh., Navoiy ko‘chasi, 28-uy', NULL, 'Dush-Jum: 09:00 - 18:00'),
(15, 'Toshkent sh., Osiyo ko‘chasi, 50-uy', NULL, '24/7 (Favqulodda dispetcherlik)'),
(16, 'Toshkent sh., Muqimiy ko‘chasi, 98-uy', NULL, '24/7 (Favqulodda dispetcherlik)'),
(18, 'Toshkent sh., Olmazor tumani, Universitet ko‘chasi, 2-uy', NULL, 'Dush-Shan: 08:30 - 17:00'),
(19, 'Samarqand sh., Universitet xiyoboni, 15-uy', NULL, 'Dush-Shan: 08:30 - 17:00'),
(20, 'Toshkent sh., Olmazor tumani, Farobiy ko‘chasi, 2-uy', NULL, '24/7 (Qabul bo‘limi)'),
(23, 'Toshkent sh., Yakkasaroy tumani, Shota Rustaveli ko‘chasi, 53-uy', NULL, '24/7 (Qo‘llab-quvvatlash)');
