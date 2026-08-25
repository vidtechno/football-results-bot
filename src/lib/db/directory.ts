import { createAdminClient } from '@/lib/supabase/server';
import {
  Category,
  Region,
  Organization,
  OrganizationReport,
  DigitalService,
  Contact,
  OrganizationEmail,
  OrganizationAlias,
  OrganizationServiceKeyword,
  WorkingSchedule,
} from '@/lib/types/directory';
import { normalizeSearchTerm } from '@/lib/utils/formatters';
import crypto from 'crypto';

export interface SearchFilters {
  query?: string;
  categorySlug?: string;
  regionSlug?: string;
  verifiedOnly?: boolean;
  organizationType?: 'bank' | 'government' | 'public_service' | 'utility' | 'telecom' | 'private_service' | string;
  hasDigitalServicesOnly?: boolean;
  limit?: number;
}

/**
 * Safely redact raw phone numbers and emails from search analytics terms
 */
export function redactSearchTerm(term: string): string {
  if (!term) return '';
  let cleaned = term.trim();
  // Redact email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  // Redact long 7+ digit phone numbers
  cleaned = cleaned.replace(/\+?\d[\d\s-]{6,}\d/g, '[phone]');
  return cleaned.trim();
}

/**
 * Log search query analytics safely
 */
export async function recordSearchQuery(queryText: string, resultCount: number, visitorId: string): Promise<boolean> {
  try {
    const safeTerm = redactSearchTerm(queryText);
    if (!safeTerm || safeTerm.length < 2) return false;

    const salt = process.env.ANALYTICS_SALT || 'manbora_privacy_salt_2026';
    const visitor_hash = crypto.createHash('sha256').update(`${visitorId}_${salt}`).digest('hex');

    const supabase = createAdminClient();
    const { error } = await supabase.from('search_query_analytics').insert([{
      query_text: safeTerm,
      has_results: resultCount > 0,
      result_count: resultCount,
      visitor_hash,
    }]);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Relative freshness label calculation for public profiles
 */
export function formatFreshnessLabel(updatedAt?: string | null): string {
  if (!updatedAt) return 'Yaqinda tekshirildi';

  const updatedDate = new Date(updatedAt).getTime();
  if (isNaN(updatedDate)) return 'Yaqinda tekshirildi';

  const diffMs = Date.now() - updatedDate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 24) {
    return 'Bugun yangilandi';
  } else if (diffDays === 1) {
    return 'Kechagi yangilanish';
  } else if (diffDays < 30) {
    return `${diffDays} kun oldin yangilandi`;
  } else if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} oy oldin yangilandi`;
  }

  return 'Yaqinda tekshirildi';
}

/**
 * Evaluates live working status based on Tashkent time (Asia/Tashkent)
 */
export function formatWorkingStatus(schedule?: WorkingSchedule | null, is247?: boolean): {
  isOpen: boolean | null;
  label: string;
  textClass: string;
  is247?: boolean;
} {
  if (is247) {
    return {
      isOpen: true,
      label: '24/7 ishlaydi',
      textClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      is247: true,
    };
  }

  if (!schedule) {
    return {
      isOpen: null,
      label: 'Ish vaqti ko‘rsatilmagan',
      textClass: 'bg-slate-50 text-slate-500 border-slate-200',
    };
  }

  // Evaluate Tashkent time (UTC+5)
  try {
    const now = new Date();
    const uzTimeString = now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' });
    const uzDate = new Date(uzTimeString);

    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
    const dayKey = dayMap[uzDate.getDay()];
    const daySched = schedule[dayKey];

    if (!daySched || daySched.is_closed) {
      return {
        isOpen: false,
        label: 'Hozir yopiq (Dam olish)',
        textClass: 'bg-rose-50 text-rose-700 border-rose-200',
      };
    }

    if (daySched.open && daySched.close) {
      const currentMinutes = uzDate.getHours() * 60 + uzDate.getMinutes();

      const [openH, openM] = daySched.open.split(':').map(Number);
      const [closeH, closeM] = daySched.close.split(':').map(Number);

      const openMinutes = openH * 60 + (openM || 0);
      const closeMinutes = closeH * 60 + (closeM || 0);

      // Check lunch break
      let isLunch = false;
      if (daySched.lunch_start && daySched.lunch_end) {
        const [lStartH, lStartM] = daySched.lunch_start.split(':').map(Number);
        const [lEndH, lEndM] = daySched.lunch_end.split(':').map(Number);
        const lStartMinutes = lStartH * 60 + (lStartM || 0);
        const lEndMinutes = lEndH * 60 + (lEndM || 0);

        if (currentMinutes >= lStartMinutes && currentMinutes < lEndMinutes) {
          isLunch = true;
        }
      }

      if (isLunch) {
        return {
          isOpen: false,
          label: 'Hozir yopiq (Tushlik)',
          textClass: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      }

      if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
        return {
          isOpen: true,
          label: 'Hozir ochiq',
          textClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
      } else {
        return {
          isOpen: false,
          label: 'Hozir yopiq',
          textClass: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      }
    }

    return {
      isOpen: null,
      label: schedule.note || 'Ish tartibi mavjud',
      textClass: 'bg-slate-50 text-slate-600 border-slate-200',
    };
  } catch {
    return {
      isOpen: null,
      label: 'Ish tartibi mavjud',
      textClass: 'bg-slate-50 text-slate-600 border-slate-200',
    };
  }
}

/**
 * Deduplicate digital services array by service_type + url
 */
function deduplicateDigitalServices(services?: DigitalService[]): DigitalService[] {
  if (!services || services.length === 0) return [];
  const seen = new Set<string>();
  const unique: DigitalService[] = [];

  for (const s of services) {
    const key = `${s.service_type.toLowerCase()}:${s.url.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }

  return unique;
}

/**
 * Deduplicate contacts array by phone_number
 */
function deduplicateContacts(contacts?: Contact[]): Contact[] {
  if (!contacts || contacts.length === 0) return [];
  const seen = new Set<string>();
  const unique: Contact[] = [];

  for (const c of contacts) {
    const key = c.phone_number.replace(/\D/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  return unique;
}

/**
 * Deduplicate emails array by email
 */
function deduplicateEmails(emails?: OrganizationEmail[]): OrganizationEmail[] {
  if (!emails || emails.length === 0) return [];
  const seen = new Set<string>();
  const unique: OrganizationEmail[] = [];

  for (const e of emails) {
    const key = e.email.trim().toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(e);
    }
  }

  return unique;
}

/**
 * Fetch all categories with organization count
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createAdminClient();

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !categories) return [];

    const { data: orgs } = await supabase
      .from('organizations')
      .select('category_id')
      .eq('status', 'published');

    const countMap = new Map<number, number>();
    orgs?.forEach((o) => {
      if (o.category_id) {
        countMap.set(o.category_id, (countMap.get(o.category_id) || 0) + 1);
      }
    });

    return categories.map((c) => ({
      ...c,
      organization_count: countMap.get(c.id) || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch a single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Category;
  } catch {
    return null;
  }
}

/**
 * Fetch all regions with organization count
 */
export async function getRegions(): Promise<Region[]> {
  try {
    const supabase = createAdminClient();

    const { data: regions, error } = await supabase
      .from('regions')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !regions) return [];

    const { data: orgs } = await supabase
      .from('organizations')
      .select('region_id')
      .eq('status', 'published');

    const countMap = new Map<number, number>();
    orgs?.forEach((o) => {
      if (o.region_id) {
        countMap.set(o.region_id, (countMap.get(o.region_id) || 0) + 1);
      }
    });

    return regions.map((r) => ({
      ...r,
      organization_count: countMap.get(r.id) || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch organization branches for a parent organization
 */
export async function getOrganizationBranches(parentId: number, regionId?: number): Promise<Organization[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('organizations')
      .select(`
        *,
        category:categories(*),
        region:regions(*),
        contacts:organization_contacts(*),
        emails:organization_emails(*),
        locations:organization_locations(*)
      `)
      .eq('parent_id', parentId)
      .eq('status', 'published')
      .order('is_verified', { ascending: false })
      .order('name', { ascending: true });

    if (regionId) {
      query = query.eq('region_id', regionId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((o: any) => ({
      ...o,
      contacts: deduplicateContacts(o.contacts),
      emails: deduplicateEmails(o.emails),
    })) as Organization[];
  } catch {
    return [];
  }
}

/**
 * Fetch count of branches for a parent organization
 */
export async function getBranchesCount(parentId: number): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from('organizations')
      .select('id', { count: 'exact' })
      .eq('parent_id', parentId)
      .eq('status', 'published');

    return error || count === null ? 0 : count;
  } catch {
    return 0;
  }
}

/**
 * Fetch organization aliases
 */
export async function getOrganizationAliases(organizationId: number): Promise<OrganizationAlias[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('organization_aliases')
      .select('*')
      .eq('organization_id', organizationId);

    return error || !data ? [] : (data as OrganizationAlias[]);
  } catch {
    return [];
  }
}

/**
 * Fetch organization service keywords
 */
export async function getOrganizationServiceKeywords(organizationId: number): Promise<OrganizationServiceKeyword[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('organization_service_keywords')
      .select('*')
      .eq('organization_id', organizationId);

    return error || !data ? [] : (data as OrganizationServiceKeyword[]);
  } catch {
    return [];
  }
}

/**
 * Multi-filter search for published organizations with alias & service keyword matching
 */
export async function searchOrganizations(filters: SearchFilters = {}): Promise<Organization[]> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('organizations')
      .select(`
        *,
        category:categories(*),
        region:regions(*),
        contacts:organization_contacts(*),
        emails:organization_emails(*),
        social_links:organization_social_links(*),
        locations:organization_locations(*),
        digital_services:organization_digital_services(*),
        aliases:organization_aliases(*),
        service_keywords:organization_service_keywords(*)
      `)
      .eq('status', 'published')
      .order('is_verified', { ascending: false })
      .order('name', { ascending: true });

    if (filters.verifiedOnly) {
      query = query.eq('is_verified', true);
    }

    if (filters.organizationType) {
      query = query.eq('organization_type', filters.organizationType);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    let results = data.map((o: any) => ({
      ...o,
      contacts: deduplicateContacts(o.contacts),
      emails: deduplicateEmails(o.emails),
      digital_services: deduplicateDigitalServices(o.digital_services),
    })) as Organization[];

    // Filter by digital services presence
    if (filters.hasDigitalServicesOnly) {
      results = results.filter((o) => o.digital_services && o.digital_services.length > 0);
    }

    // Filter by category slug
    if (filters.categorySlug) {
      results = results.filter((o) => o.category?.slug === filters.categorySlug);
    }

    // Filter by region slug
    if (filters.regionSlug) {
      results = results.filter((o) => o.region?.slug === filters.regionSlug);
    }

    // Filter by search query with intelligent alias & keyword matching
    if (filters.query && filters.query.trim()) {
      const norm = normalizeSearchTerm(filters.query);

      results = results
        .map((o) => {
          const nameNorm = normalizeSearchTerm(o.name);
          const descNorm = normalizeSearchTerm(o.description || '');
          const catNorm = normalizeSearchTerm(o.category?.name || '');
          const regNorm = normalizeSearchTerm(o.region?.name || '');
          const websiteNorm = normalizeSearchTerm(o.website_url || '');
          const typeNorm = normalizeSearchTerm(o.organization_type || '');
          const phones = o.contacts?.map((c) => c.phone_number).join(' ') || '';
          const emailsNorm = o.emails?.map((e) => `${e.email} ${e.label || ''}`).join(' ') || '';
          const locationsNorm = o.locations
            ?.map((loc) => `${loc.address} ${loc.city_district || ''}`)
            .join(' ') || '';
          const servicesNorm = o.digital_services
            ?.map((ds) => `${ds.title} ${ds.description || ''} ${ds.service_type} ${ds.platform_name || ''}`)
            .join(' ') || '';

          let matchReason: string | undefined = undefined;

          // Check official name / details match first
          const isDirectMatch =
            nameNorm.includes(norm) ||
            descNorm.includes(norm) ||
            catNorm.includes(norm) ||
            regNorm.includes(norm) ||
            websiteNorm.includes(norm) ||
            typeNorm.includes(norm) ||
            phones.includes(norm) ||
            normalizeSearchTerm(emailsNorm).includes(norm) ||
            normalizeSearchTerm(locationsNorm).includes(norm) ||
            normalizeSearchTerm(servicesNorm).includes(norm);

          if (isDirectMatch) {
            return { ...o };
          }

          // Check service keyword match
          const matchedService = o.service_keywords?.find((sk) => {
            const titleNorm = normalizeSearchTerm(sk.service_title);
            const kwNorm = sk.keywords.map(normalizeSearchTerm);
            return titleNorm.includes(norm) || kwNorm.some((k) => k.includes(norm));
          });

          if (matchedService) {
            matchReason = `Xizmat: ${matchedService.service_title}`;
            return { ...o, match_reason: matchReason };
          }

          // Check alias match
          const matchedAlias = o.aliases?.find((a) => normalizeSearchTerm(a.alias).includes(norm));
          if (matchedAlias) {
            matchReason = `Muqobil nom: ${matchedAlias.alias}`;
            return { ...o, match_reason: matchReason };
          }

          return null;
        })
        .filter((o): o is Organization => o !== null);
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fetch a single organization by slug with complete details (including branches & aliases)
 */
export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('organizations')
      .select(`
        *,
        category:categories(*),
        region:regions(*),
        contacts:organization_contacts(*),
        emails:organization_emails(*),
        social_links:organization_social_links(*),
        locations:organization_locations(*),
        digital_services:organization_digital_services(*),
        aliases:organization_aliases(*),
        service_keywords:organization_service_keywords(*)
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) return null;

    const org = data as Organization;

    // Fetch branches if this is a main organization
    let branches: Organization[] = [];
    if (!org.is_branch) {
      branches = await getOrganizationBranches(org.id);
    }

    // Fetch parent organization if this is a branch
    let parent_org: Organization | null = null;
    if (org.parent_id) {
      const { data: parentData } = await supabase
        .from('organizations')
        .select('id, name, slug, logo_url')
        .eq('id', org.parent_id)
        .single();
      if (parentData) {
        parent_org = parentData as Organization;
      }
    }

    return {
      ...org,
      branches,
      parent_org,
      contacts: deduplicateContacts(org.contacts),
      emails: deduplicateEmails(org.emails),
      digital_services: deduplicateDigitalServices(org.digital_services),
    };
  } catch {
    return null;
  }
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Pure calculation helper for pagination bounds & ranges
 */
export function calculatePagination(totalCount: number, requestedPage: number, pageSize: number = 20) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const validRequestedPage = Number.isInteger(requestedPage) ? requestedPage : 1;
  const currentPage = Math.min(Math.max(1, validRequestedPage), totalPages);
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  return {
    totalPages,
    currentPage,
    startIndex,
    endIndex,
    pageSize,
    totalCount,
  };
}

/**
 * Pure popularity calculator function for raw events
 * Aggregates unique visitor hashes per published organization
 */
export function computePopularityScores(
  events: Array<{ organization_id: number; visitor_hash: string; event_type?: string }>,
  publishedOrgs: Organization[],
  limit: number = 5,
): Organization[] {
  if (!events || events.length === 0 || !publishedOrgs || publishedOrgs.length === 0) {
    return [];
  }

  const publishedMap = new Map<number, Organization>();
  publishedOrgs.forEach((o) => {
    if (o.status === 'published') {
      publishedMap.set(o.id, o);
    }
  });

  const visitorSetMap = new Map<number, Set<string>>();
  events.forEach((ev) => {
    if (publishedMap.has(ev.organization_id) && ev.visitor_hash) {
      if (!visitorSetMap.has(ev.organization_id)) {
        visitorSetMap.set(ev.organization_id, new Set());
      }
      visitorSetMap.get(ev.organization_id)!.add(ev.visitor_hash);
    }
  });

  const scoredOrgs: Array<{ org: Organization; score: number }> = [];
  visitorSetMap.forEach((visitors, orgId) => {
    const org = publishedMap.get(orgId);
    if (org) {
      scoredOrgs.push({
        org,
        score: visitors.size,
      });
    }
  });

  scoredOrgs.sort((a, b) => b.score - a.score || a.org.name.localeCompare(b.org.name));

  return scoredOrgs.slice(0, limit).map((s) => s.org);
}

/**
 * Fetch top popular published organizations calculated from unique visitor behavior in the last N days
 */
export async function getPopularOrganizations(limit: number = 5, days: number = 30): Promise<Organization[]> {
  try {
    const supabase = createAdminClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsError } = await supabase
      .from('organization_popularity_events')
      .select('organization_id, visitor_hash, event_type')
      .gte('created_at', startDate);

    if (eventsError || !events || events.length === 0) {
      return [];
    }

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        *,
        category:categories(*),
        region:regions(*),
        contacts:organization_contacts(*),
        emails:organization_emails(*),
        social_links:organization_social_links(*),
        locations:organization_locations(*),
        digital_services:organization_digital_services(*)
      `)
      .eq('status', 'published');

    if (orgsError || !orgs) return [];

    const fullOrgs = orgs.map((o: any) => ({
      ...o,
      contacts: deduplicateContacts(o.contacts),
      emails: deduplicateEmails(o.emails),
      digital_services: deduplicateDigitalServices(o.digital_services),
    })) as Organization[];

    return computePopularityScores(events, fullOrgs, limit);
  } catch {
    return [];
  }
}

/**
 * Server-side paginated organizations by category
 */
export async function getCategoryOrganizationsPaginated(
  categorySlug: string,
  requestedPage: number = 1,
  pageSize: number = 20,
): Promise<PaginatedResult<Organization> & { category: Category | null }> {
  try {
    const category = await getCategoryBySlug(categorySlug);
    if (!category) {
      return {
        data: [],
        category: null,
        totalCount: 0,
        totalPages: 1,
        currentPage: 1,
        pageSize,
        startIndex: 0,
        endIndex: 0,
      };
    }

    const supabase = createAdminClient();

    // Count total published items in this category
    const { count, error: countError } = await supabase
      .from('organizations')
      .select('id', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published');

    const totalCount = countError || count === null ? 0 : count;
    const pagination = calculatePagination(totalCount, requestedPage, pageSize);

    if (totalCount === 0) {
      return {
        data: [],
        category,
        ...pagination,
      };
    }

    // Server-side range query with stable multi-column ordering
    const fromIndex = (pagination.currentPage - 1) * pageSize;
    const toIndex = fromIndex + pageSize - 1;

    const { data: orgs, error: dataError } = await supabase
      .from('organizations')
      .select(`
        *,
        category:categories(*),
        region:regions(*),
        contacts:organization_contacts(*),
        emails:organization_emails(*),
        social_links:organization_social_links(*),
        locations:organization_locations(*),
        digital_services:organization_digital_services(*)
      `)
      .eq('category_id', category.id)
      .eq('status', 'published')
      .order('is_verified', { ascending: false })
      .order('updated_at', { ascending: false })
      .order('name', { ascending: true })
      .range(fromIndex, toIndex);

    if (dataError || !orgs) {
      return {
        data: [],
        category,
        ...pagination,
      };
    }

    const cleanedOrgs = orgs.map((o: any) => ({
      ...o,
      contacts: deduplicateContacts(o.contacts),
      emails: deduplicateEmails(o.emails),
      digital_services: deduplicateDigitalServices(o.digital_services),
    })) as Organization[];

    return {
      data: cleanedOrgs,
      category,
      ...pagination,
    };
  } catch {
    return {
      data: [],
      category: null,
      totalCount: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize,
      startIndex: 0,
      endIndex: 0,
    };
  }
}

/**
 * Fetch home page dataset with real popular organizations
 */
export async function getHomeData() {
  const [categories, regions, featuredOrgs, popularOrgs, totalOrgs, totalServices] = await Promise.all([
    getCategories(),
    getRegions(),
    searchOrganizations({ limit: 12 }),
    getPopularOrganizations(5, 30),
    createAdminClient().from('organizations').select('id', { count: 'exact' }).eq('status', 'published'),
    createAdminClient().from('organization_digital_services').select('id', { count: 'exact' }),
  ]);

  return {
    categories,
    regions,
    featuredOrgs,
    popularOrgs,
    totalOrganizations: totalOrgs.count || featuredOrgs.length,
    totalDigitalServices: totalServices.count || 0,
  };
}

/**
 * Submit organization report
 */
export async function submitOrganizationReport(report: OrganizationReport): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from('organization_reports').insert([{
      organization_id: report.organization_id,
      report_type: report.report_type,
      message: report.message,
      target_contact: report.target_contact || null,
      status: 'pending',
    }]);

    if (!error) {
      // Create admin notification
      await supabase.from('admin_notifications').insert([{
        type: 'report',
        title: report.report_type === 'contact_issue' ? 'Aloqa raqami xatosi haqida xabar' : 'Tashkilot bo‘yicha xabar',
        summary: `Tashkilot ID #${report.organization_id}: ${report.message.slice(0, 100)}`,
        link_url: `/diyoration/reports`,
        target_id: String(report.organization_id),
      }]);
    }

    return !error;
  } catch {
    return false;
  }
}
