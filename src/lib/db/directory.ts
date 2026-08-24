import { createAdminClient } from '@/lib/supabase/server';
import { Category, Region, Organization, OrganizationReport } from '@/lib/types/directory';
import { normalizeSearchTerm } from '@/lib/utils/formatters';

export interface SearchFilters {
  query?: string;
  categorySlug?: string;
  regionSlug?: string;
  verifiedOnly?: boolean;
  limit?: number;
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

    // Fetch counts per category
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
 * Multi-filter search for published organizations
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
        social_links:organization_social_links(*),
        locations:organization_locations(*)
      `)
      .eq('status', 'published')
      .order('is_verified', { ascending: false })
      .order('name', { ascending: true });

    if (filters.verifiedOnly) {
      query = query.eq('is_verified', true);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    let results = data as Organization[];

    // Filter by category slug
    if (filters.categorySlug) {
      results = results.filter((o) => o.category?.slug === filters.categorySlug);
    }

    // Filter by region slug
    if (filters.regionSlug) {
      results = results.filter((o) => o.region?.slug === filters.regionSlug);
    }

    // Filter by search query (name, description, category, region, phone)
    if (filters.query && filters.query.trim()) {
      const norm = normalizeSearchTerm(filters.query);
      results = results.filter((o) => {
        const nameNorm = normalizeSearchTerm(o.name);
        const descNorm = normalizeSearchTerm(o.description || '');
        const catNorm = normalizeSearchTerm(o.category?.name || '');
        const regNorm = normalizeSearchTerm(o.region?.name || '');
        const phones = o.contacts?.map((c) => c.phone_number).join(' ') || '';

        return (
          nameNorm.includes(norm) ||
          descNorm.includes(norm) ||
          catNorm.includes(norm) ||
          regNorm.includes(norm) ||
          phones.includes(norm)
        );
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Fetch a single organization by slug with complete details
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
        social_links:organization_social_links(*),
        locations:organization_locations(*)
      `)
      .eq('slug', slug)
      .single();

    if (error || !data) return null;
    return data as Organization;
  } catch {
    return null;
  }
}

/**
 * Fetch home page dataset
 */
export async function getHomeData() {
  const [categories, featuredOrgs, totalOrgs] = await Promise.all([
    getCategories(),
    searchOrganizations({ limit: 12 }),
    createAdminClient().from('organizations').select('id', { count: 'exact' }).eq('status', 'published'),
  ]);

  return {
    categories,
    featuredOrgs,
    totalOrganizations: totalOrgs.count || featuredOrgs.length,
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
      status: 'pending',
    }]);

    return !error;
  } catch {
    return false;
  }
}
