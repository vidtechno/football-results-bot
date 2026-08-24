import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ success: true, message: 'Tizimdan chiqildi' });
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
