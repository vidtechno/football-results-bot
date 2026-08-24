import { NextRequest, NextResponse } from 'next/server';
import { syncFixtures } from '@/lib/sync/fixtures';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secretQuery = req.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    const isHeaderValid = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isQueryValid = cronSecret && secretQuery === cronSecret;

    // Check authorization secret
    if (cronSecret && !isHeaderValid && !isQueryValid) {
      return NextResponse.json(
        { error: 'Ruxsat berilmadi: Yaroqsiz maxfiy kalit' },
        { status: 401 },
      );
    }

    const dateParam = req.nextUrl.searchParams.get('date');
    const dates = dateParam ? [dateParam] : undefined;

    const result = await syncFixtures({ dates });

    if (!result.success) {
      return NextResponse.json(
        {
          message: 'Sinxronizatsiyada xatolik yuz berdi',
          result,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: 'Sinxronizatsiya muvaffaqiyatli yakunlandi',
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Ichki server xatoligi' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
