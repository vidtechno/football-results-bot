import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, logAdminAction } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Ruxsat berilmadi' }, { status: 401 });
  }

  try {
    const { id, action, convert_to_org } = await req.json();
    if (!id || !action) {
      return NextResponse.json({ error: 'ID va amal tanlanishi shart' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch suggestion
    const { data: suggestion, error: fetchErr } = await supabase
      .from('organization_suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: 'Taklif topilmadi' }, { status: 404 });
    }

    if (action === 'reject') {
      await supabase
        .from('organization_suggestions')
        .update({ status: 'rejected' })
        .eq('id', id);

      await logAdminAction(supabase, session.username, 'update', 'suggestion', String(id), { status: 'rejected' });

      return NextResponse.json({ success: true, message: 'Taklif rad etildi' });
    }

    if (action === 'accept') {
      let newOrg = null;

      if (convert_to_org) {
        // Create organization record from suggestion
        const baseSlug = slugify(suggestion.name);

        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .insert([
            {
              name: suggestion.name,
              slug: `${baseSlug}-${Date.now().toString().slice(-4)}`,
              category_id: suggestion.category_id,
              region_id: suggestion.region_id,
              website_url: suggestion.website_url,
              source_url: suggestion.source_url,
              status: 'draft',
              verification_status: 'pending_review',
            },
          ])
          .select()
          .single();

        if (org) {
          newOrg = org;

          // Add contact if provided
          if (suggestion.phone_number) {
            await supabase.from('organization_contacts').insert([
              {
                organization_id: org.id,
                label: 'Rasmiy Aloqa',
                phone_number: suggestion.phone_number,
                is_primary: true,
              },
            ]);
          }

          // Add location if city_district provided
          if (suggestion.city_district) {
            await supabase.from('organization_locations').insert([
              {
                organization_id: org.id,
                address: suggestion.city_district,
                city_district: suggestion.city_district,
              },
            ]);
          }
        }
      }

      await supabase
        .from('organization_suggestions')
        .update({ status: 'accepted' })
        .eq('id', id);

      await logAdminAction(supabase, session.username, 'update', 'suggestion', String(id), {
        status: 'accepted',
        converted_org_id: newOrg?.id,
      });

      return NextResponse.json({ success: true, message: 'Taklif qabul qilindi', created_organization: newOrg });
    }

    return NextResponse.json({ error: 'Noma’lum amal' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server xatoligi' }, { status: 500 });
  }
}
