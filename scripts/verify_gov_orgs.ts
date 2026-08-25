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
  console.log('Verifying 10 government organizations in Supabase...');

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
      keywords:organization_service_keywords(id, keywords)
    `)
    .in('slug', targetSlugs);

  if (error) {
    console.error('Error fetching organizations:', error);
    process.exit(1);
  }

  console.log(`Found ${orgs?.length || 0} / 10 target organizations.`);

  if (!orgs || orgs.length !== 10) {
    console.error(`Expected 10 organizations, but found ${orgs?.length}`);
    process.exit(1);
  }

  let allValid = true;

  for (const org of orgs) {
    console.log(`\n----------------------------------------`);
    console.log(`Org ID #${org.id}: ${org.name} (/${org.slug})`);
    console.log(`Status: ${org.status} | Verified: ${org.is_verified} (${org.verification_status})`);
    console.log(`Last Verified At: ${org.last_verified_at}`);
    console.log(`Website: ${org.website_url}`);
    console.log(`Source: ${org.source_name} -> ${org.source_url}`);
    console.log(`Contacts (${org.contacts.length}):`, org.contacts.map((c: any) => `${c.label}: ${c.phone_number}`).join(' | '));
    console.log(`Emails (${org.emails.length}):`, org.emails.map((e: any) => e.email).join(', '));
    console.log(`Locations (${org.locations.length}):`, org.locations.map((l: any) => `${l.address} [${l.working_hours || 'N/A'}]`).join(' | '));

    if (!org.is_verified || org.verification_status !== 'verified' || org.status !== 'published') {
      console.error(`ERROR: ${org.slug} is not verified/published correctly.`);
      allValid = false;
    }

    if (org.contacts.length === 0) {
      console.error(`ERROR: ${org.slug} has 0 contacts.`);
      allValid = false;
    }

    if (org.emails.length === 0) {
      console.error(`ERROR: ${org.slug} has 0 emails.`);
      allValid = false;
    }

    if (org.locations.length === 0 || !org.locations[0].address) {
      console.error(`ERROR: ${org.slug} has no address location.`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('\n========================================');
    console.log('SUCCESS: All 10 organizations and their fields are 100% verified!');
    console.log('========================================');
  } else {
    console.error('\nFAILED: Validation checks failed for one or more organizations.');
    process.exit(1);
  }
}

verify();
