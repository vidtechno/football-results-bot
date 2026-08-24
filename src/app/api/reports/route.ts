import { NextRequest, NextResponse } from 'next/server';
import { submitOrganizationReport } from '@/lib/db/directory';
import { ReportSchema } from '@/lib/types/directory';

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = ReportSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Noto‘g‘ri ma’lumot formati', details: parsed.error.format() },
        { status: 400 },
      );
    }

    const success = await submitOrganizationReport({
      organization_id: parsed.data.organization_id,
      report_type: parsed.data.report_type,
      message: parsed.data.message,
    });

    if (!success) {
      return NextResponse.json(
        { error: 'Xabarni saqlashda server xatoligi' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Xabar muvaffaqiyatli qabul qilindi',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Ichki server xatoligi' },
      { status: 500 },
    );
  }
}
