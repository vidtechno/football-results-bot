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

interface GovOrgSeed {
  name: string;
  slug: string;
  category_slug: string;
  organization_type: string;
  description: string;
  phones: { phone_number: string; label: string; contact_type: string; is_primary?: boolean }[];
  email: string;
  website: string;
  address: string;
  working_hours?: string;
  keywords: string[];
  source_name: string;
  source_url: string;
  aliases?: string[];
}

const govOrgs: GovOrgSeed[] = [
  {
    name: 'O‘zbekiston Respublikasi Raqamli texnologiyalar vazirligi',
    slug: 'raqamli-texnologiyalar-vazirligi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Raqamli hukumat, IT, telekommunikatsiya va pochta sohasini muvofiqlashtiruvchi davlat organi.',
    phones: [
      { phone_number: '+998712384107', label: 'Bosh idora', contact_type: 'head_office', is_primary: true },
      { phone_number: '1199', label: 'Ishonch telefoni', contact_type: 'call_center' },
    ],
    email: 'info@digital.uz',
    website: 'https://gov.uz/digital',
    address: 'Toshkent shahri, Ibrohim Muminov ko‘chasi, 4-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['IT', 'internet', 'aloqa', 'telekommunikatsiya', 'raqamli hukumat'],
    source_name: 'Raqamli texnologiyalar vazirligi rasmiy sayti',
    source_url: 'https://gov.uz/oz/digital/contacts',
    aliases: ['MinDigital', 'Digital', 'Raqamli texnologiyalar'],
  },
  {
    name: 'O‘zbekiston Respublikasi Soliq qo‘mitasi',
    slug: 'soliq-qomitasi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Soliq hisobotlari, to‘lovlar, keshbek va soliq qarzdorligi bo‘yicha xizmatlarni yurituvchi davlat organi.',
    phones: [
      { phone_number: '1198', label: 'Call-markaz', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712449898', label: 'Ishonch telefoni', contact_type: 'fraud_hotline' },
      { phone_number: '+998712449801', label: 'Devonxona', contact_type: 'head_office' },
    ],
    email: 'org@soliq.uz',
    website: 'https://gov.uz/soliq',
    address: 'Toshkent shahri, Abdulla Qodiriy ko‘chasi, 13-A',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['soliq', 'keshbek', 'deklaratsiya', 'STIR', 'qarzdorlik'],
    source_name: 'Soliq qo‘mitasi rasmiy sayti',
    source_url: 'https://gov.uz/oz/soliq/contacts',
    aliases: ['Soliq uz', 'GNI', 'DSK', 'Soliq inspeksiyasi'],
  },
  {
    name: 'O‘zbekiston Respublikasi Ichki ishlar vazirligi',
    slug: 'ichki-ishlar-vazirligi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Jamoat xavfsizligi, huquqbuzarliklar, pasport va migratsiya masalalari bo‘yicha davlat organi.',
    phones: [
      { phone_number: '102', label: 'Tezkor xizmat', contact_type: 'other', is_primary: true },
      { phone_number: '1102', label: 'Ishonch telefoni', contact_type: 'call_center' },
      { phone_number: '+998712314304', label: 'Bosh idora', contact_type: 'head_office' },
    ],
    email: 'info@iiv.uz',
    website: 'https://gov.uz/iiv',
    address: 'Toshkent shahri, Yunus Rajabiy ko‘chasi, 1-uy',
    working_hours: 'Dushanba–Shanba, 09:00–18:00',
    keywords: ['politsiya', 'IIB', 'pasport', 'migratsiya', 'xavfsizlik'],
    source_name: 'Ichki ishlar vazirligi rasmiy sayti',
    source_url: 'https://gov.uz/oz/iiv/contacts',
    aliases: ['IIV', 'IIB', 'MVD', 'Militsiya'],
  },
  {
    name: 'O‘zbekiston Respublikasi Adliya vazirligi',
    slug: 'adliya-vazirligi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Notarial xizmatlar, FHDYO, davlat xizmatlari markazlari va huquqiy maslahatlar bo‘yicha vazirlik.',
    phones: [
      { phone_number: '1008', label: 'Huquqiy maslahat', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712070443', label: 'Bosh idora', contact_type: 'head_office' },
    ],
    email: 'info@adliya.uz',
    website: 'https://gov.uz/adliya',
    address: 'Toshkent shahri, Sayilgoh ko‘chasi, 5-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['adliya', 'notarius', 'FHDYO', 'tug‘ilganlik guvohnomasi', 'huquqiy yordam'],
    source_name: 'Adliya vazirligi rasmiy sayti',
    source_url: 'https://gov.uz/oz/adliya/contacts',
    aliases: ['Adliya', 'Davxizmat', 'MinJust'],
  },
  {
    name: 'O‘zbekiston Respublikasi Ekologiya va iqlim o‘zgarishi milliy qo‘mitasi',
    slug: 'ekologiya-va-iqlim-ozgarishi-milliy-qomitasi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Atrof-muhitni muhofaza qilish, chiqindi, daraxt kesilishi va ekologik murojaatlar bo‘yicha davlat organi.',
    phones: [
      { phone_number: '1157', label: 'Ekologik murojaatlar', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712070770', label: 'Bosh idora', contact_type: 'head_office' },
    ],
    email: 'info@eco.gov.uz',
    website: 'https://gov.uz/eco',
    address: 'Toshkent shahri, Chilonzor tumani, Bunyodkor shoh ko‘chasi, 7-A',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['ekologiya', 'chiqindi', 'daraxt', 'havo', 'tabiatga zarar'],
    source_name: 'Ekologiya qo‘mitasi rasmiy sayti',
    source_url: 'https://gov.uz/oz/eco/contacts',
    aliases: ['Ekologiya vazirligi', 'Eco', 'Goskomekologiya'],
  },
  {
    name: 'O‘zbekiston Respublikasi Transport vazirligi',
    slug: 'transport-vazirligi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Avtomobil, temir yo‘l, aviatsiya, jamoat transporti va logistika sohasini muvohiqlashtiruvchi vazirlik.',
    phones: [
      { phone_number: '1167', label: 'Ishonch telefoni', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712020501', label: 'Bosh idora', contact_type: 'head_office' },
    ],
    email: 'info@mintrans.uz',
    website: 'https://gov.uz/mintrans',
    address: 'Toshkent viloyati, Yuqori Chirchiq tumani, Istiqbol MFY, Yangi Toshkent shahri hududi',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['transport', 'avtobus', 'taksi', 'temir yo‘l', 'aviachipta', 'logistika'],
    source_name: 'Transport vazirligi rasmiy sayti',
    source_url: 'https://gov.uz/oz/mintrans/contacts',
    aliases: ['MinTrans', 'Transport', 'Mintrans.uz'],
  },
  {
    name: 'O‘zbekiston Respublikasi Maktabgacha va maktab ta’limi vazirligi',
    slug: 'maktabgacha-va-maktab-talimi-vazirligi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Maktablar, bog‘chalar, o‘qituvchilar va umumiy ta’lim tizimi bo‘yicha vazirlik.',
    phones: [
      { phone_number: '+998712020909', label: 'Call-markaz va Bosh idora', contact_type: 'call_center', is_primary: true },
    ],
    email: 'info@uzedu.uz',
    website: 'https://gov.uz/uzedu',
    address: 'Toshkent shahri, Navoiy ko‘chasi, 2A-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00',
    keywords: ['maktab', 'bog‘cha', 'o‘qituvchi', 'attestat', 'ta’lim'],
    source_name: 'Maktabgacha va maktab ta’limi vazirligi rasmiy sayti',
    source_url: 'https://gov.uz/oz/uzedu/contacts',
    aliases: ['XTV', 'Maktab ta’limi', 'MVT', 'Uzedu'],
  },
  {
    name: 'O‘zbekiston Respublikasi Oliy ta’lim, fan va innovatsiyalar vazirligi',
    slug: 'oliy-talim-fan-va-innovatsiyalar-vazirligi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'OTMlar, grantlar, talabalar, ilmiy faoliyat va innovatsiyalar bo‘yicha vazirlik.',
    phones: [
      { phone_number: '1006', label: 'Ishonch telefoni', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998555200808', label: 'Devonxona, ichki 195 yoki 202', contact_type: 'head_office' },
    ],
    email: 'devonxona@edu.uz',
    website: 'https://gov.uz/edu',
    address: 'Toshkent shahri, Universitet ko‘chasi, 7-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['universitet', 'OTM', 'grant', 'magistratura', 'kontrakt', 'talaba'],
    source_name: 'Oliy ta’lim, fan va innovatsiyalar vazirligi rasmiy sayti',
    source_url: 'https://gov.uz/oz/edu/contacts',
    aliases: ['Oliy ta’lim vazirligi', 'MinEdu', 'Edu.uz'],
  },
  {
    name: 'O‘zbekiston Respublikasi Bojxona qo‘mitasi',
    slug: 'bojxona-qomitasi',
    category_slug: 'davlat-tashkilotlari',
    organization_type: 'government',
    description: 'Tovarlarni olib kirish-chiqarish, deklaratsiya va bojxona rasmiylashtiruvi bo‘yicha davlat organi.',
    phones: [
      { phone_number: '1108', label: 'Call-markaz', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712029990', label: 'Bosh idora', contact_type: 'head_office' },
    ],
    email: 'bi@customs.uz',
    website: 'https://customs.uz',
    address: 'Toshkent shahri, Qozirobod 2-tor ko‘chasi, 118-uy',
    keywords: ['bojxona', 'deklaratsiya', 'import', 'eksport', 'chegara'],
    source_name: 'Bojxona qo‘mitasi rasmiy sayti',
    source_url: 'https://customs.uz/',
    aliases: ['Bojxona', 'Customs', 'GTK'],
  },
  {
    name: 'O‘zbekiston Respublikasi Markaziy banki',
    slug: 'markaziy-bank',
    category_slug: 'banklar',
    organization_type: 'bank',
    description: 'Pul-kredit siyosati, banklar faoliyati va moliyaviy xizmatlar iste’molchilari masalalari bo‘yicha markaziy organ.',
    phones: [
      { phone_number: '1800', label: 'Call-markaz', contact_type: 'call_center', is_primary: true },
      { phone_number: '+998712000044', label: 'Ishonch telefoni', contact_type: 'call_center' },
      { phone_number: '08002000044', label: 'Hududlardan bepul', contact_type: 'call_center' },
    ],
    email: 'info@cbu.uz',
    website: 'https://cbu.uz',
    address: 'Toshkent shahri, Islom Karimov ko‘chasi, 6-uy',
    working_hours: 'Dushanba–Juma, 09:00–18:00; tushlik 13:00–14:00',
    keywords: ['markaziy bank', 'kredit', 'bank', 'valyuta', 'moliyaviy murojaat'],
    source_name: 'O‘zbekiston Respublikasi Markaziy banki rasmiy sayti',
    source_url: 'https://cbu.uz/en/contacts/',
    aliases: ['Markaziy bank', 'CBU', 'Central Bank'],
  },
];

async function seed() {
  console.log('Starting seed process for 10 verified Uzbekistan government organizations...');

  // 1. Fetch categories and regions map
  const { data: categories, error: catErr } = await supabase.from('categories').select('id, slug');
  if (catErr || !categories) {
    console.error('Error fetching categories:', catErr);
    process.exit(1);
  }

  const categoryMap = new Map<string, number>();
  categories.forEach((c) => categoryMap.set(c.slug, c.id));

  // Get default region (Toshkent / Tashkent)
  const { data: regions } = await supabase.from('regions').select('id, slug, name');
  const defaultRegionId = regions?.find((r) => r.slug === 'toshkent' || r.name.toLowerCase().includes('toshkent'))?.id || null;

  const nowIso = new Date().toISOString();

  for (const orgData of govOrgs) {
    const categoryId = categoryMap.get(orgData.category_slug) || null;

    // Check if organization already exists by slug or website
    const { data: existing } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .or(`slug.eq.${orgData.slug},website_url.eq.${orgData.website}`)
      .maybeSingle();

    let orgId: number;

    if (existing) {
      console.log(`Organization "${orgData.name}" already exists (ID: ${existing.id}). Updating data...`);
      orgId = existing.id;

      const { error: updateErr } = await supabase
        .from('organizations')
        .update({
          name: orgData.name,
          slug: orgData.slug,
          description: orgData.description,
          category_id: categoryId,
          region_id: defaultRegionId,
          organization_type: orgData.organization_type,
          website_url: orgData.website,
          source_name: orgData.source_name,
          source_url: orgData.source_url,
          is_verified: true,
          verification_status: 'verified',
          status: 'published',
          last_verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', orgId);

      if (updateErr) {
        console.error(`Failed to update organization ${orgData.slug}:`, updateErr);
        continue;
      }
    } else {
      console.log(`Inserting new organization "${orgData.name}"...`);

      const { data: newOrg, error: insertErr } = await supabase
        .from('organizations')
        .insert({
          name: orgData.name,
          slug: orgData.slug,
          description: orgData.description,
          category_id: categoryId,
          region_id: defaultRegionId,
          organization_type: orgData.organization_type,
          website_url: orgData.website,
          source_name: orgData.source_name,
          source_url: orgData.source_url,
          is_verified: true,
          verification_status: 'verified',
          status: 'published',
          last_verified_at: nowIso,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select('id')
        .single();

      if (insertErr || !newOrg) {
        console.error(`Failed to insert organization ${orgData.slug}:`, insertErr);
        continue;
      }

      orgId = newOrg.id;
    }

    // 2. Insert Contacts
    if (orgData.phones.length > 0) {
      await supabase.from('organization_contacts').delete().eq('organization_id', orgId);
      const contactRows = orgData.phones.map((p) => ({
        organization_id: orgId,
        label: p.label,
        phone_number: p.phone_number,
        contact_type: p.contact_type,
        source_url: orgData.source_url,
        is_primary: Boolean(p.is_primary),
      }));
      await supabase.from('organization_contacts').insert(contactRows);
    }

    // 3. Insert Email
    if (orgData.email) {
      await supabase.from('organization_emails').delete().eq('organization_id', orgId);
      await supabase.from('organization_emails').insert({
        organization_id: orgId,
        email: orgData.email,
        label: 'Umumiy murojaatlar',
        is_primary: true,
        is_verified: true,
        sort_order: 1,
      });
    }

    // 4. Insert Address Location
    if (orgData.address) {
      await supabase.from('organization_locations').delete().eq('organization_id', orgId);
      await supabase.from('organization_locations').insert({
        organization_id: orgId,
        address: orgData.address,
        working_hours: orgData.working_hours || null,
      });
    }

    // 5. Insert Service Keywords
    if (orgData.keywords.length > 0) {
      await supabase.from('organization_service_keywords').delete().eq('organization_id', orgId);
      await supabase.from('organization_service_keywords').insert({
        organization_id: orgId,
        service_title: orgData.name,
        keywords: orgData.keywords,
      });
    }

    // 6. Insert Aliases
    if (orgData.aliases && orgData.aliases.length > 0) {
      await supabase.from('organization_aliases').delete().eq('organization_id', orgId);
      const aliasRows = orgData.aliases.map((alias) => ({
        organization_id: orgId,
        alias: alias.trim(),
      }));
      await supabase.from('organization_aliases').insert(aliasRows);
    }
  }

  console.log('Seed completed successfully for all 10 organizations!');
}

seed();
