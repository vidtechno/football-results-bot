import { NextRequest, NextResponse } from 'next/server';
import { getMatchesByDate } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const compIdParam = searchParams.get('competitionId');
    const compId = compIdParam ? parseInt(compIdParam, 10) : undefined;

    const fixtures = await getMatchesByDate(dateStr, compId);

    return NextResponse.json({
      date: dateStr,
      count: fixtures.length,
      fixtures,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'O‘yinlarni yuklashda xatolik yuz berdi' },
      { status: 500 },
    );
  }
}
