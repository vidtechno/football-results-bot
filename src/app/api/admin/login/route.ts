import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  checkRateLimit,
  clearRateLimit,
  createSessionToken,
  logAdminAction,
  verifyPassword,
} from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';

    // Rate limiting check
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      const minutes = Math.ceil((rateCheck.remainingMs || 60000) / 60000);
      return NextResponse.json(
        { error: `Juda ko‘p noto‘g‘ri urinishlar. ${minutes} daqiqadan so‘ng qaytadan urinib ko‘ring.` },
        { status: 429 },
      );
    }

    const { username, password } = await req.json();

    const expectedUsername = process.env.ADMIN_USERNAME || 'diyoration';
    const expectedPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!username || !password) {
      return NextResponse.json({ error: 'Foydalanuvchi nomi va parol kiritilishi shart' }, { status: 400 });
    }

    // Validate username and password hash
    const isUsernameValid = username.trim().toLowerCase() === expectedUsername.toLowerCase();
    const isPasswordValid = verifyPassword(password, expectedPasswordHash || 'Diyoration2026!');

    if (!isUsernameValid || !isPasswordValid) {
      return NextResponse.json({ error: 'Foydalanuvchi nomi yoki parol noto‘g‘ri' }, { status: 401 });
    }

    // Clear rate limit on successful authentication
    clearRateLimit(ip);

    // Generate signed session token
    const token = createSessionToken(username, 'owner');

    const res = NextResponse.json({ success: true, message: 'Muvaffaqiyatli tizimga kirildi' });

    // Set secure HTTP-only cookie
    res.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    // Log admin login action
    const supabase = createAdminClient();
    await logAdminAction(supabase, username, 'login', 'admin_session', 'session', { ip });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Tizimga kirishda xatolik' }, { status: 500 });
  }
}
