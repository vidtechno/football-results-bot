import { NextRequest, NextResponse } from 'next/server';
import { searchOrganizations } from '@/lib/db/directory';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || undefined;
    const categorySlug = searchParams.get('category') || undefined;
    const regionSlug = searchParams.get('region') || undefined;
    const verifiedOnly = searchParams.get('verified') === 'true';
    const organizationType = searchParams.get('type') || undefined;
    const hasDigitalServicesOnly = searchParams.get('digital') === 'true';

    const organizations = await searchOrganizations({
      query,
      categorySlug,
      regionSlug,
      verifiedOnly,
      organizationType,
      hasDigitalServicesOnly,
    });

    return NextResponse.json({
      count: organizations.length,
      organizations,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Qidiruvda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
