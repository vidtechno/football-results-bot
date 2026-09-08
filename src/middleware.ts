import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  if (host.startsWith('www.manbora.uz')) {
    const url = request.nextUrl.clone();
    url.host = 'manbora.uz';
    url.protocol = 'https:';
    return NextResponse.redirect(url, { status: 308 });
  }

  const pathname = request.nextUrl.pathname;

  // Canonical admin route is /diyoration; redirect /admin and /admin/* with 308
  if (pathname === '/admin') {
    const dest = new URL('/diyoration/dashboard', request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, { status: 308 });
  }
  if (pathname.startsWith('/admin/')) {
    const dest = new URL(pathname.replace(/^\/admin/, '/diyoration'), request.url);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, { status: 308 });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const allCookies = request.cookies.getAll();
  // Check if any Supabase authentication cookies exist (supporting @supabase/ssr chunked format)
  const hasAuthCookie = allCookies.some((c) => {
    const isSsrToken = /^sb-[a-z0-9_-]+-auth-token(\.\d+)?$/i.test(c.name);
    const isLegacyToken =
      c.name === 'sb-access-token' ||
      c.name === 'supabase-auth-token' ||
      c.name === 'sb-auth-token';
    return (isSsrToken || isLegacyToken) && Boolean(c.value?.trim());
  });

  const isProtectedPath =
    pathname === '/kabinet' ||
    pathname.startsWith('/kabinet/') ||
    pathname === '/diyoration' ||
    pathname.startsWith('/diyoration/') ||
    pathname === '/muallif' ||
    pathname.startsWith('/muallif/');

  // Intercept protected paths for guests without auth cookie immediately
  if (isProtectedPath && !hasAuthCookie) {
    const loginUrl = new URL('/kirish', request.url);
    loginUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // If no auth cookie exists, skip remote network call to prevent waterfall latency for anonymous visitors
  if (!hasAuthCookie) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (
    process.env.NODE_ENV === 'production' &&
    (!supabaseUrl ||
      supabaseUrl.includes('placeholder.supabase.co') ||
      !supabaseAnonKey ||
      supabaseAnonKey === 'placeholder_anon_key')
  ) {
    console.error('Xatolik: Ishlab chiqarish muhitida Supabase URL yoki Anon Key o‘rnatilmagan!');
    return NextResponse.json({ error: 'Server sozlamalari xatosi' }, { status: 500 });
  }

  const supabase = createServerClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder_anon_key',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validates user and refreshes expired tokens in cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath) {
    const loginUrl = new URL('/kirish', request.url);
    loginUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     * - Static asset extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico, .txt, .xml)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)',
  ],
};
