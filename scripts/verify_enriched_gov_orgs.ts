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

const supabase = createClient(supabaseUrl, supabaseKey);

const targetSlugs = [
  'raqamli-texnologiyalar-vazirligi',
  'soliq-qomitasi',
  'ichki-ishlar-vazirligi',
  'adliya-vazirligi',
  'ekologiya-va-iqlim-ozgarishi-milliy-qomitasi',
  'transport-vazirligi',
  'maktabgacha-va-maktab-talimi-vazirligi',
  'oliy-talim-fan-va-innovatsiyalar-vazirligi',
  'bojxona-qomitasi',
  'markaziy-bank',
];

async function verify() {
  console.log('Verifying enriched data for 10 government organizations...');

  const { data: orgs, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      website_url,
      source_name,
      source_url,
      is_verified,
      verification_status,
      status,
      last_verified_at,
      contacts:organization_contacts(id, phone_number, label, contact_type),
      emails:organization_emails(id, email, label),
      locations:organization_locations(id, address, working_hours),
      socials:organization_social_links(id, platform, url),
      services:organization_digital_services(id, title, description, service_type, url, platform_name, is_official),
      keywords:organization_service_keywords(id, keywords),
      aliases:organization_aliases(id, alias)
    `)
    .in('slug', targetSlugs);

  if (error || !orgs || orgs.length !== 10) {
    console.error('Verification failed or incomplete org count:', error);
    process.exit(1);
  }

  let totalContacts = 0;
  let totalEmails = 0;
  let totalSocials = 0;
  let totalServices = 0;

  for (const org of orgs) {
    console.log(`\n========================================`);
    console.log(`[${org.slug}] ${org.name}`);
    console.log(`Contacts: ${org.contacts.length} | Emails: ${org.emails.length} | Socials: ${org.socials.length} | Digital Services/Apps: ${org.services.length}`);
    console.log(`Source: ${org.source_name} (${org.source_url})`);

    totalContacts += org.contacts.length;
    totalEmails += org.emails.length;
    totalSocials += org.socials.length;
    totalServices += org.services.length;

    // Check zero counts
    if (org.contacts.length === 0 || org.emails.length === 0 || org.socials.length === 0 || org.services.length === 0) {
      console.error(`ERROR: Org ${org.slug} has missing sections!`);
      process.exit(1);
    }

    // Verify digital services for non-empty descriptions and valid URLs
    for (const s of org.services) {
      if (!s.title || !s.description || !s.url || !s.service_type || !s.is_official) {
        console.error(`ERROR: Service ${s.id} in ${org.slug} is missing required fields:`, s);
        process.exit(1);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`GRAND TOTALS:`);
  console.log(`Total Contacts: ${totalContacts}`);
  console.log(`Total Emails: ${totalEmails}`);
  console.log(`Total Social Profiles: ${totalSocials}`);
  console.log(`Total Digital Services & Apps: ${totalServices}`);
  console.log(`ALL 10 GOVERNMENT PROFILES SUCCESSFULLY ENRICHED & VERIFIED!`);
  console.log(`========================================`);
}

verify();
