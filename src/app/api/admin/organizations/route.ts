import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi. Qaytadan kiring.' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { name, category_id, region_id, organization_type, description, website_url, source_url, source_name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tashkilot nomi kiritilishi shart' }, { status: 400 });
    }

    const generatedSlug = slugify(name) + '-' + Math.floor(100 + Math.random() * 900);

    const { data: newOrg, error } = await supabase
      .from('organizations')
      .insert([
        {
          name: name.trim(),
          slug: generatedSlug,
          description: description?.trim() || null,
          category_id: category_id ? Number(category_id) : null,
          region_id: region_id ? Number(region_id) : null,
          organization_type: organization_type || 'private_service',
          website_url: website_url?.trim() || null,
          source_url: source_url?.trim() || null,
          source_name: source_name?.trim() || null,
          is_verified: true,
          verification_status: 'verified',
          status: 'published',
          last_verified_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error || !newOrg) {
      return NextResponse.json({ error: error?.message || 'Tashkilotni yaratishda xatolik' }, { status: 500 });
    }

    await logAdminAction(supabase, session.username, 'create', 'organization', newOrg.id, { name: newOrg.name });

    return NextResponse.json({ success: true, organization: newOrg });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi. Qaytadan kiring.' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const body = await req.json();
    const { id, name, slug, description, category_id, region_id, organization_type, website_url, source_url, source_name, status, is_verified, verification_status, contacts, digital_services, social_links, locations } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tashkilot ID tanlanmagan' }, { status: 400 });
    }

    // 1. Update basic org info
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updatePayload.name = name.trim();
    if (slug) updatePayload.slug = slugify(slug);
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;
    if (category_id !== undefined) updatePayload.category_id = category_id ? Number(category_id) : null;
    if (region_id !== undefined) updatePayload.region_id = region_id ? Number(region_id) : null;
    if (organization_type) updatePayload.organization_type = organization_type;
    if (website_url !== undefined) updatePayload.website_url = website_url ? website_url.trim() : null;
    if (source_url !== undefined) updatePayload.source_url = source_url ? source_url.trim() : null;
    if (source_name !== undefined) updatePayload.source_name = source_name ? source_name.trim() : null;
    if (status) updatePayload.status = status;
    if (is_verified !== undefined) updatePayload.is_verified = is_verified;
    if (verification_status) updatePayload.verification_status = verification_status;

    const { error: orgErr } = await supabase.from('organizations').update(updatePayload).eq('id', id);
    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    // 2. Sync Contacts if provided
    if (Array.isArray(contacts)) {
      await supabase.from('organization_contacts').delete().eq('organization_id', id);
      if (contacts.length > 0) {
        const contactRows = contacts.map((c: any) => ({
          organization_id: id,
          label: c.label || 'Aloqa raqami',
          phone_number: c.phone_number,
          contact_type: c.contact_type || 'call_center',
          source_url: c.source_url || null,
          is_primary: Boolean(c.is_primary),
        }));
        await supabase.from('organization_contacts').insert(contactRows);
      }
    }

    // 3. Sync Digital Services if provided
    if (Array.isArray(digital_services)) {
      await supabase.from('organization_digital_services').delete().eq('organization_id', id);
      if (digital_services.length > 0) {
        const serviceRows = digital_services.map((ds: any, idx: number) => ({
          organization_id: id,
          title: ds.title,
          description: ds.description || null,
          service_type: ds.service_type || 'website',
          url: ds.url,
          platform_name: ds.platform_name || null,
          is_official: ds.is_official !== false,
          source_url: ds.source_url || null,
          sort_order: idx + 1,
        }));
        await supabase.from('organization_digital_services').insert(serviceRows);
      }
    }

    // 4. Sync Social Links if provided
    if (Array.isArray(social_links)) {
      await supabase.from('organization_social_links').delete().eq('organization_id', id);
      if (social_links.length > 0) {
        const socialRows = social_links.map((s: any) => ({
          organization_id: id,
          platform: s.platform || 'website',
          url: s.url,
        }));
        await supabase.from('organization_social_links').insert(socialRows);
      }
    }

    // 5. Sync Locations if provided
    if (Array.isArray(locations)) {
      await supabase.from('organization_locations').delete().eq('organization_id', id);
      if (locations.length > 0) {
        const locRows = locations.map((l: any) => ({
          organization_id: id,
          address: l.address,
          map_url: l.map_url || null,
          working_hours: l.working_hours || null,
        }));
        await supabase.from('organization_locations').insert(locRows);
      }
    }

    await logAdminAction(supabase, session.username, 'update', 'organization', id, { name });

    return NextResponse.json({ success: true, message: 'Tashkilot ma’lumotlari yangilandi' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi. Qaytadan kiring.' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'O‘chiriladigan tashkilot ID tanlanmagan' }, { status: 400 });
    }

    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction(supabase, session.username, 'delete', 'organization', id);

    return NextResponse.json({ success: true, message: 'Tashkilot muvaffaqiyatli o‘chirildi' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
