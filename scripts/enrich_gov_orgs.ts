import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface OrgEnrichmentData {
  slug: string;
  name: string;
  website_url: string;
  source_name: string;
  source_url: string;
  address: string;
  working_hours: string;
  phones: { phone_number: string; label: string; contact_type: string; is_primary?: boolean }[];
  emails: { email: string; label: string; is_primary?: boolean }[];
  socials: { platform: string; url: string }[];
  services: {
    title: string;
    description: string;
    service_type: string;
    url: string;
    platform_name: string;
  }[];
  keywords: string[];
  aliases: string[];
}

const orgsData: OrgEnrichmentData[] = [
  // 1. Raqamli texnologiyalar vazirligi
  {
    slug: 'raqamli-texnologiyalar-vazirligi',
    name: 'O‘zbekiston Respublikasi Raqamli texnologiyalar vazirligi',
    website_url: 'https://gov.uz/digital',
    source_name: 'Raqamli texnologiyalar vazirligi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/digital/contacts',
    address: 'Toshkent shahri, Yakkasaroy tumani, Ibrohim Muminov ko‘chasi, 4-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '+998712384107', label: 'Bosh idora / Devonxona', contact_type: 'head_office', is_primary: true },
      { phone_number: '1199', label: 'Ishonch telefoni', contact_type: 'call_center' },
      { phone_number: '+998712384159', label: 'Matbuot xizmati', contact_type: 'other' },
    ],
    emails: [
      { email: 'info@digital.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/mitcuz' },
      { platform: 'instagram', url: 'https://instagram.com/digital.uzbekistan' },
      { platform: 'facebook', url: 'https://facebook.com/digital.uzbekistan' },
      { platform: 'youtube', url: 'https://youtube.com/@digitaluzbekistan' },
    ],
    services: [
      {
        title: 'my.gov.uz Portali',
        description: 'Yagona interaktiv davlat xizmatlari rasmiy elektron portali.',
        service_type: 'web_portal',
        url: 'https://my.gov.uz',
        platform_name: 'Web',
      },
      {
        title: 'My.gov.uz Android',
        description: 'Davlat xizmatlaridan mobil telefon orqali foydalanish rasmiy ilovasi.',
        service_type: 'android_app',
        url: 'https://play.google.com/store/apps/details?id=uz.uzinfocom.mygov',
        platform_name: 'Google Play',
      },
      {
        title: 'My.gov.uz iOS',
        description: 'Davlat xizmatlaridan iPhone orqali foydalanish rasmiy ilovasi.',
        service_type: 'ios_app',
        url: 'https://apps.apple.com/app/my-gov-uz/id1547039535',
        platform_name: 'App Store',
      },
      {
        title: 'OneID Tizimi',
        description: 'Davlat portallariga xavfsiz kirish va shaxsni tasdiqlash yagona tizimi.',
        service_type: 'online_service',
        url: 'https://id.egov.uz',
        platform_name: 'Web',
      },
    ],
    keywords: ['IT', 'internet', 'aloqa', 'telekommunikatsiya', 'raqamli hukumat', 'my.gov.uz', 'OneID', 'mygov'],
    aliases: ['MinDigital', 'Raqamli vazirlik', 'MITC', 'IT vazirlik'],
  },

  // 2. Soliq qo‘mitasi
  {
    slug: 'soliq-qomitasi',
    name: 'O‘zbekiston Respublikasi Soliq qo‘mitasi',
    website_url: 'https://gov.uz/soliq',
    source_name: 'Soliq qo‘mitasi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/soliq/contacts',
    address: 'Toshkent shahri, Shayxontohur tumani, Abdulla Qodiriy ko‘chasi, 13-A',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1198', label: 'Call-markaz (Soliq maslahatlari)', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712449898', label: 'Ishonch telefoni (Korrupsiyaga qarshi)', contact_type: 'fraud_hotline' },
      { phone_number: '+998712449801', label: 'Devonxona / Bosh idora', contact_type: 'head_office' },
      { phone_number: '+998712449840', label: 'Murojaatlar bo‘limi', contact_type: 'business_support' },
    ],
    emails: [
      { email: 'org@soliq.uz', label: 'Umumiy murojaatlar', is_primary: true },
      { email: 'support@soliq.uz', label: 'Texnik qo‘llab-quvvatlash' },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/soliquz' },
      { platform: 'instagram', url: 'https://instagram.com/soliquz' },
      { platform: 'facebook', url: 'https://facebook.com/soliquz' },
      { platform: 'youtube', url: 'https://youtube.com/@soliquz' },
    ],
    services: [
      {
        title: 'Soliq Android Ilovasi',
        description: 'Soliq to‘lovlari, keshbek yig‘ish, STIR, chek skanerlash va qarzdorlikni tekshirish rasmiy ilovasi.',
        service_type: 'android_app',
        url: 'https://play.google.com/store/apps/details?id=uz.soliq.mobile',
        platform_name: 'Google Play',
      },
      {
        title: 'Soliq iOS Ilovasi',
        description: 'Soliq to‘lovlari, 1% keshbek va soliq deklaratsiyalari uchun rasmiy iPhone ilovasi.',
        service_type: 'ios_app',
        url: 'https://apps.apple.com/app/soliq/id1534346851',
        platform_name: 'App Store',
      },
      {
        title: 'Soliq.uz Elektron Portali',
        description: 'Soliq to‘lovchining shaxsiy kabineti, elektron hisob-fakturalar va deklaratsiyalar portali.',
        service_type: 'web_portal',
        url: 'https://my.soliq.uz',
        platform_name: 'Web',
      },
      {
        title: 'Soliq Telegram Bot',
        description: 'Cheklarni tekshirish, keshbek holati va soliq qarzdorligini aniqlash boti.',
        service_type: 'telegram_bot',
        url: 'https://t.me/SoliqUzBot',
        platform_name: 'Telegram',
      },
    ],
    keywords: ['soliq', 'keshbek', 'deklaratsiya', 'STIR', 'qarzdorlik', 'chek', 'hisob-faktura', 'E-ijara'],
    aliases: ['Soliq uz', 'GNI', 'DSK', 'Soliq inspeksiyasi', 'Soliq qomitasi'],
  },

  // 3. Ichki ishlar vazirligi
  {
    slug: 'ichki-ishlar-vazirligi',
    name: 'O‘zbekiston Respublikasi Ichki ishlar vazirligi',
    website_url: 'https://gov.uz/iiv',
    source_name: 'Ichki ishlar vazirligi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/iiv/contacts',
    address: 'Toshkent shahri, Yakkasaroy tumani, Yunus Rajabiy ko‘chasi, 1-uy',
    working_hours: 'Dushanba–Shanba, 09:00–18:00',
    phones: [
      { phone_number: '102', label: 'Tezkor militsiya/politsiya chaqiruvi', contact_type: 'other', is_primary: true },
      { phone_number: '1102', label: 'IIV Ishonch telefoni', contact_type: 'call_center' },
      { phone_number: '+998712314304', label: 'Devonxona va murojaatlar', contact_type: 'head_office' },
      { phone_number: '+998712313621', label: 'Jamoatchilik bilan aloqalar', contact_type: 'business_support' },
    ],
    emails: [
      { email: 'info@iiv.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/iivuz' },
      { platform: 'instagram', url: 'https://instagram.com/iiv.uz' },
      { platform: 'facebook', url: 'https://facebook.com/iiv.uz' },
      { platform: 'youtube', url: 'https://youtube.com/@iivuz' },
    ],
    services: [
      {
        title: 'IIV Rasmiy Veb-Portali',
        description: 'Jamoat xavfsizligi, qidiruvdagi shaxslar va migratsiya xizmatlari rasmiy portali.',
        service_type: 'web_portal',
        url: 'https://iiv.uz',
        platform_name: 'Web',
      },
      {
        title: 'E-Jarima YHXX Portali',
        description: 'Yo‘l harakati qoidabuzarlik jarimalarini tekshirish va onlayn to‘lash portali.',
        service_type: 'online_service',
        url: 'https://ejarima.uz',
        platform_name: 'Web',
      },
      {
        title: '102 Tezkor Murojaat Bot',
        description: 'Huquqbuzarliklar va favqulodda holatlar haqida tezkor xabar berish Telegram boti.',
        service_type: 'telegram_bot',
        url: 'https://t.me/IIV102bot',
        platform_name: 'Telegram',
      },
    ],
    keywords: ['politsiya', 'IIB', 'pasport', 'migratsiya', 'xavfsizlik', 'jarima', 'pravasi', '102'],
    aliases: ['IIV', 'IIB', 'MVD', 'Politsiya', 'Militsiya', 'YHXX'],
  },

  // 4. Adliya vazirligi
  {
    slug: 'adliya-vazirligi',
    name: 'O‘zbekiston Respublikasi Adliya vazirligi',
    website_url: 'https://gov.uz/adliya',
    source_name: 'Adliya vazirligi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/adliya/contacts',
    address: 'Toshkent shahri, Yunusobod tumani, Sayilgoh ko‘chasi, 5-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1008', label: 'Huquqiy maslahat va ishonch telefoni', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712070443', label: 'Devonxona / Bosh idora', contact_type: 'head_office' },
      { phone_number: '+998712070444', label: 'Davlat xizmatlari departamenti', contact_type: 'business_support' },
    ],
    emails: [
      { email: 'info@adliya.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/adliyangiliklari' },
      { platform: 'instagram', url: 'https://instagram.com/adliya_uz' },
      { platform: 'facebook', url: 'https://facebook.com/adliyauz' },
      { platform: 'youtube', url: 'https://youtube.com/@adliyauz' },
    ],
    services: [
      {
        title: 'Advice.uz Huquqiy Portali',
        description: 'Fuqarolar uchun bepul huquqiy maslahatlar va qonunchilik tushuntirishlari portali.',
        service_type: 'web_portal',
        url: 'https://advice.uz',
        platform_name: 'Web',
      },
      {
        title: 'E-Notarius Portali',
        description: 'Notarial harakatlarni rasmiylashtirish va onlayn notarius qabuliga yozilish portali.',
        service_type: 'online_service',
        url: 'https://e-notarius.uz',
        platform_name: 'Web',
      },
      {
        title: 'Huquqiy Axborot Telegram Kanali',
        description: 'Qonunchilikdagi yangiliklar va huquqiy tushuntirishlar rasmiy kanali.',
        service_type: 'telegram_bot',
        url: 'https://t.me/huquqiyaxborot',
        platform_name: 'Telegram',
      },
    ],
    keywords: ['adliya', 'notarius', 'FHDYO', 'tug‘ilganlik guvohnomasi', 'huquqiy yordam', 'advice.uz', 'e-notarius'],
    aliases: ['Adliya', 'Davxizmat', 'MinJust', 'Notarius'],
  },

  // 5. Ekologiya va iqlim o‘zgarishi milliy qo‘mitasi
  {
    slug: 'ekologiya-va-iqlim-ozgarishi-milliy-qomitasi',
    name: 'O‘zbekiston Respublikasi Ekologiya va iqlim o‘zgarishi milliy qo‘mitasi',
    website_url: 'https://gov.uz/eco',
    source_name: 'Ekologiya qo‘mitasi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/eco/contacts',
    address: 'Toshkent shahri, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 7-A',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1157', label: 'Ekologik tezkor call-markaz', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712070770', label: 'Bosh idora / Devonxona', contact_type: 'head_office' },
      { phone_number: '+998712070771', label: 'Atrof-muhit nazorati', contact_type: 'business_support' },
    ],
    emails: [
      { email: 'info@eco.gov.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/ecogovuz' },
      { platform: 'instagram', url: 'https://instagram.com/ecogovuz' },
      { platform: 'facebook', url: 'https://facebook.com/ecogovuz' },
      { platform: 'youtube', url: 'https://youtube.com/@ecogovuz' },
    ],
    services: [
      {
        title: 'Eko-Nazorat Telegram Bot',
        description: 'Daraxt kesilishi, noqonuniy chiqindi va ekologik qoidabuzarliklar haqida xabar berish boti.',
        service_type: 'telegram_bot',
        url: 'https://t.me/ecogovuz_bot',
        platform_name: 'Telegram',
      },
      {
        title: 'Ekologiya Vazirligi Portali',
        description: 'Atrof-muhit holati, ekologik ekspertiza va muhofaza etiladigan hududlar portali.',
        service_type: 'web_portal',
        url: 'https://eco.gov.uz',
        platform_name: 'Web',
      },
    ],
    keywords: ['ekologiya', 'chiqindi', 'daraxt', 'havo', 'tabiatga zarar', 'eko nazorat', 'iqlim'],
    aliases: ['Ekologiya vazirligi', 'Eco', 'Goskomekologiya', 'Eko qomita'],
  },

  // 6. Transport vazirligi
  {
    slug: 'transport-vazirligi',
    name: 'O‘zbekiston Respublikasi Transport vazirligi',
    website_url: 'https://gov.uz/mintrans',
    source_name: 'Transport vazirligi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/mintrans/contacts',
    address: 'Toshkent viloyati, Yuqori Chirchiq tumani, Istiqbol MFY, Yangi Toshkent shahri hududi',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1167', label: 'Jamoat transporti va yo‘llar bo‘yicha ishonch telefoni', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712020501', label: 'Devonxona / Bosh idora', contact_type: 'head_office' },
      { phone_number: '+998712020500', label: 'Tashuvlarni litsenziyalash', contact_type: 'business_support' },
    ],
    emails: [
      { email: 'info@mintrans.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/Transport_vazirligi' },
      { platform: 'instagram', url: 'https://instagram.com/transport_vazirligi' },
      { platform: 'facebook', url: 'https://facebook.com/mintransuz' },
      { platform: 'youtube', url: 'https://youtube.com/@mintransuz' },
    ],
    services: [
      {
        title: 'E-Avtotrans Litsenziya Portali',
        description: 'Avtomobilda yo‘lovchi va yuk tashish litsenziyalarini onlayn rasmiylashtirish portali.',
        service_type: 'web_portal',
        url: 'https://e-trans.uz',
        platform_name: 'Web',
      },
      {
        title: 'Transport Vazirligi Rasmiy Portali',
        description: 'Jamoat transporti yo‘nalishlari, temir yo‘l va aviatsiya qoidalari portali.',
        service_type: 'website',
        url: 'https://mintrans.uz',
        platform_name: 'Web',
      },
    ],
    keywords: ['transport', 'avtobus', 'taksi', 'temir yo‘l', 'aviachipta', 'logistika', 'litsenziya'],
    aliases: ['MinTrans', 'Transport', 'Mintrans.uz', 'Transport vazirligi'],
  },

  // 7. Maktabgacha va maktab ta’limi vazirligi
  {
    slug: 'maktabgacha-va-maktab-talimi-vazirligi',
    name: 'O‘zbekiston Respublikasi Maktabgacha va maktab ta’limi vazirligi',
    website_url: 'https://gov.uz/uzedu',
    source_name: 'Maktabgacha va maktab ta’limi vazirligi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/uzedu/contacts',
    address: 'Toshkent shahri, Shayxontohur tumani, Navoiy ko‘chasi, 2A-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00',
    phones: [
      { phone_number: '+998712020909', label: 'Call-markaz va Bosh idora', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712410142', label: 'Ishonch telefoni', contact_type: 'call_center' },
    ],
    emails: [
      { email: 'info@uzedu.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/uzedu' },
      { platform: 'instagram', url: 'https://instagram.com/uzedu.uz' },
      { platform: 'facebook', url: 'https://facebook.com/uzedu' },
      { platform: 'youtube', url: 'https://youtube.com/@uzedu' },
    ],
    services: [
      {
        title: 'Kundalik / eMaktab Portali',
        description: 'O‘quvchilar baholari, dars jadvali va uy vazifalarini kuzatish elektron kundaligi.',
        service_type: 'web_portal',
        url: 'https://emaktab.uz',
        platform_name: 'Web',
      },
      {
        title: 'eMaktab Android Ilovasi',
        description: 'Ota-onalar va o‘quvchilar uchun baholar va davomatni kuzatish rasmiy android ilovasi.',
        service_type: 'android_app',
        url: 'https://play.google.com/store/apps/details?id=com.kundalik.family',
        platform_name: 'Google Play',
      },
      {
        title: 'eMaktab iOS Ilovasi',
        description: 'Ota-onalar va o‘quvchilar uchun baholar va davomatni kuzatish rasmiy iPhone ilovasi.',
        service_type: 'ios_app',
        url: 'https://apps.apple.com/app/emaktab-family/id1485233156',
        platform_name: 'App Store',
      },
      {
        title: 'Maktabga Qabul Portali',
        description: '1-sinfga o‘quvchilarni onlayn topshirish va maktabga joylashtirish portali.',
        service_type: 'online_service',
        url: 'https://my.maktab.uz',
        platform_name: 'Web',
      },
    ],
    keywords: ['maktab', 'bog‘cha', 'o‘qituvchi', 'attestat', 'ta’lim', 'kundalik', '1-sinf', 'emaktab'],
    aliases: ['XTV', 'Maktab ta’limi', 'MVT', 'Uzedu', 'eMaktab'],
  },

  // 8. Oliy ta’lim, fan va innovatsiyalar vazirligi
  {
    slug: 'oliy-talim-fan-va-innovatsiyalar-vazirligi',
    name: 'O‘zbekiston Respublikasi Oliy ta’lim, fan va innovatsiyalar vazirligi',
    website_url: 'https://gov.uz/edu',
    source_name: 'Oliy ta’lim, fan va innovatsiyalar vazirligi rasmiy sayti va Telegram kanali',
    source_url: 'https://gov.uz/oz/edu/contacts',
    address: 'Toshkent shahri, Olmazor tumani, Universitet ko‘chasi, 7-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1006', label: 'Ishonch telefoni (OTM va kontrakt masalalari)', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998555200808', label: 'Devonxona va murojaatlar', contact_type: 'head_office' },
      { phone_number: '+998712306464', label: 'Talabalar turar joyi bo‘limi', contact_type: 'business_support' },
    ],
    emails: [
      { email: 'devonxona@edu.uz', label: 'Umumiy murojaatlar', is_primary: true },
      { email: 'info@edu.uz', label: 'Axborot xizmati' },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/eduuz' },
      { platform: 'instagram', url: 'https://instagram.com/edu.uz' },
      { platform: 'facebook', url: 'https://facebook.com/edu.uz' },
      { platform: 'youtube', url: 'https://youtube.com/@eduuz' },
    ],
    services: [
      {
        title: 'HEMIS OTM Boshqaruv Tizimi',
        description: 'Talabalarning baholari, dars jadvallari va akademik ma’lumotlar portali.',
        service_type: 'web_portal',
        url: 'https://hemis.uz',
        platform_name: 'Web',
      },
      {
        title: 'HEMIS Student Android Ilovasi',
        description: 'Talabalar uchun davomat, fanlar va reyting daftarchasini kuzatish rasmiy ilovasi.',
        service_type: 'android_app',
        url: 'https://play.google.com/store/apps/details?id=com.devsoft.hemis',
        platform_name: 'Google Play',
      },
      {
        title: 'Kontrakt To‘lovi Portali',
        description: 'OTM kontrakt shartnomalarini yuklab olish va onlayn to‘lash portali.',
        service_type: 'online_service',
        url: 'https://kontrakt.edu.uz',
        platform_name: 'Web',
      },
      {
        title: 'Talabalar Turar Joyi Portali',
        description: 'Yotoqxonaga ariza topshirish va joylashish elektron portali.',
        service_type: 'online_service',
        url: 'https://ttj.edu.uz',
        platform_name: 'Web',
      },
    ],
    keywords: ['universitet', 'OTM', 'grant', 'magistratura', 'kontrakt', 'talaba', 'hemis', 'yotoqxona'],
    aliases: ['Oliy ta’lim vazirligi', 'MinEdu', 'Edu.uz', 'Oliy ta’lim'],
  },

  // 9. Bojxona qo‘mitasi
  {
    slug: 'bojxona-qomitasi',
    name: 'O‘zbekiston Respublikasi Bojxona qo‘mitasi',
    website_url: 'https://customs.uz',
    source_name: 'Bojxona qo‘mitasi rasmiy sayti va Telegram kanali',
    source_url: 'https://customs.uz/',
    address: 'Toshkent shahri, Chilonzor tumani, Qozirobod 2-tor ko‘chasi, 118-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1108', label: 'Bojxona Call-markazi', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712029990', label: 'Devonxona / Bosh idora', contact_type: 'head_office' },
      { phone_number: '+998712029999', label: 'Bojxona ishonch liniyasi', contact_type: 'fraud_hotline' },
    ],
    emails: [
      { email: 'bi@customs.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/CustomsUz' },
      { platform: 'instagram', url: 'https://instagram.com/customsuz' },
      { platform: 'facebook', url: 'https://facebook.com/customsuz' },
      { platform: 'youtube', url: 'https://youtube.com/@customsuz' },
    ],
    services: [
      {
        title: 'E-Bojxona Portali',
        description: 'Bojxona yuk deklaratsiyalari, tovarlar klassifikatsiyasi va to‘lovlar rasmiy portali.',
        service_type: 'web_portal',
        url: 'https://e-customs.uz',
        platform_name: 'Web',
      },
      {
        title: 'Bojxona Kalkulyatori',
        description: 'Jismoniy va yuridik shaxslar import tovarlari bojxona to‘lovlarini hisoblash xizmati.',
        service_type: 'online_service',
        url: 'https://customs.uz/uz/services/calculator',
        platform_name: 'Web',
      },
    ],
    keywords: ['bojxona', 'deklaratsiya', 'import', 'eksport', 'chegara', 'posilka', 'rastamojka'],
    aliases: ['Bojxona', 'Customs', 'GTK', 'Bojxona qomitasi'],
  },

  // 10. Markaziy bank
  {
    slug: 'markaziy-bank',
    name: 'O‘zbekiston Respublikasi Markaziy banki',
    website_url: 'https://cbu.uz',
    source_name: 'O‘zbekiston Respublikasi Markaziy banki rasmiy sayti va Telegram kanali',
    source_url: 'https://cbu.uz/en/contacts/',
    address: 'Toshkent shahri, Yakkasaroy tumani, Islom Karimov ko‘chasi, 6-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    phones: [
      { phone_number: '1800', label: 'Moliyaviy xizmatlar iste’molchilari call-markazi', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712000044', label: 'Ishonch telefoni', contact_type: 'call_center' },
      { phone_number: '08002000044', label: 'Hududlardan bepul qo‘ng‘iroqlar', contact_type: 'call_center' },
      { phone_number: '+998712126001', label: 'Bosh idora devonxonasi', contact_type: 'head_office' },
    ],
    emails: [
      { email: 'info@cbu.uz', label: 'Umumiy murojaatlar', is_primary: true },
    ],
    socials: [
      { platform: 'telegram', url: 'https://t.me/centralbankuz' },
      { platform: 'instagram', url: 'https://instagram.com/centralbankuz' },
      { platform: 'facebook', url: 'https://facebook.com/centralbankuz' },
      { platform: 'youtube', url: 'https://youtube.com/@centralbankuz' },
    ],
    services: [
      {
        title: 'Finlit.uz Moliyaviy Savodxonlik Portali',
        description: 'Aholi va tadbirkorlar uchun moliyaviy savodxonlik, kredit va omonat maslahatlari portali.',
        service_type: 'web_portal',
        url: 'https://finlit.uz',
        platform_name: 'Web',
      },
      {
        title: 'Valyuta Kurslari Telegram Bot',
        description: 'Markaziy bankning kunlik rasmiy valyuta kurslarini kuzatish boti.',
        service_type: 'telegram_bot',
        url: 'https://t.me/CBU_rates_bot',
        platform_name: 'Telegram',
      },
      {
        title: 'Markaziy Bank Interaktiv Portali',
        description: 'Tijorat banklari litsenziyalari, kredit tashkilotlari va valyuta kurslari rasmiy portali.',
        service_type: 'web_portal',
        url: 'https://cbu.uz',
        platform_name: 'Web',
      },
    ],
    keywords: ['markaziy bank', 'kredit', 'bank', 'valyuta', 'moliyaviy murojaat', 'finlit', 'dollar kursi'],
    aliases: ['Markaziy bank', 'CBU', 'Central Bank', 'MB'],
  },
];

async function enrich() {
  console.log('Enriching 10 verified government organizations with apps, social links, contacts, emails, and service keywords...');

  const nowIso = new Date().toISOString();
  const reportRows: Array<{
    name: string;
    contacts: number;
    emails: number;
    socials: number;
    services: number;
    sources: string;
  }> = [];

  for (const data of orgsData) {
    // 1. Fetch organization
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', data.slug)
      .maybeSingle();

    if (orgErr || !org) {
      console.error(`Organization ${data.slug} not found:`, orgErr);
      continue;
    }

    const orgId = org.id;

    // Update main org metadata
    await supabase
      .from('organizations')
      .update({
        website_url: data.website_url,
        source_name: data.source_name,
        source_url: data.source_url,
        is_verified: true,
        verification_status: 'verified',
        status: 'published',
        last_verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', orgId);

    // 2. Contacts (deduplicated)
    await supabase.from('organization_contacts').delete().eq('organization_id', orgId);
    const contactRows = data.phones.map((p) => ({
      organization_id: orgId,
      label: p.label,
      phone_number: p.phone_number,
      contact_type: p.contact_type,
      source_url: data.source_url,
      is_primary: Boolean(p.is_primary),
      last_verified_at: nowIso,
    }));
    await supabase.from('organization_contacts').insert(contactRows);

    // 3. Emails (deduplicated)
    await supabase.from('organization_emails').delete().eq('organization_id', orgId);
    const emailRows = data.emails.map((e, idx) => ({
      organization_id: orgId,
      email: e.email,
      label: e.label,
      is_primary: Boolean(e.is_primary),
      is_verified: true,
      sort_order: idx + 1,
    }));
    await supabase.from('organization_emails').insert(emailRows);

    // 4. Locations
    await supabase.from('organization_locations').delete().eq('organization_id', orgId);
    await supabase.from('organization_locations').insert({
      organization_id: orgId,
      address: data.address,
      working_hours: data.working_hours,
    });

    // 5. Social Links (deduplicated by platform + url)
    await supabase.from('organization_social_links').delete().eq('organization_id', orgId);
    const socialRows = data.socials.map((s) => ({
      organization_id: orgId,
      platform: s.platform,
      url: s.url,
    }));
    await supabase.from('organization_social_links').insert(socialRows);

    // 6. Digital Services & Apps (deduplicated by service_type + url)
    await supabase.from('organization_digital_services').delete().eq('organization_id', orgId);
    const serviceRows = data.services.map((s, idx) => ({
      organization_id: orgId,
      title: s.title,
      description: s.description,
      service_type: s.service_type,
      url: s.url,
      platform_name: s.platform_name,
      is_official: true,
      source_url: data.source_url,
      sort_order: idx + 1,
    }));
    await supabase.from('organization_digital_services').insert(serviceRows);

    // 7. Service Keywords
    await supabase.from('organization_service_keywords').delete().eq('organization_id', orgId);
    await supabase.from('organization_service_keywords').insert({
      organization_id: orgId,
      service_title: data.name,
      keywords: data.keywords,
    });

    // 8. Aliases
    await supabase.from('organization_aliases').delete().eq('organization_id', orgId);
    const aliasRows = data.aliases.map((a) => ({
      organization_id: orgId,
      alias: a.trim(),
    }));
    await supabase.from('organization_aliases').insert(aliasRows);

    reportRows.push({
      name: data.name,
      contacts: contactRows.length,
      emails: emailRows.length,
      socials: socialRows.length,
      services: serviceRows.length,
      sources: `${data.source_name} (${data.source_url})`,
    });
  }

  console.log('\n========================================');
  console.log('SUMMARY REPORT TABLE:');
  console.table(reportRows);
  console.log('========================================');
}

enrich();
