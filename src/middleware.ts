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

  let supabaseResponse = NextResponse.next({
    request,
  });

  const allCookies = request.cookies.getAll();
  // Check if any Supabase authentication cookies exist
  const hasAuthCookie = allCookies.some(
    (c) =>
      (c.name.startsWith('sb-') && c.name.includes('-auth-token')) ||
      c.name === 'sb-access-token' ||
      c.name === 'supabase-auth-token'
  );

  const pathname = request.nextUrl.pathname;

  // Intercept protected paths for guests without auth cookie immediately
  if (pathname === '/kabinet' || pathname.startsWith('/kabinet/') || pathname === '/diyoration' || pathname.startsWith('/diyoration/')) {
    if (!hasAuthCookie) {
      const loginUrl = new URL('/kirish', request.url);
      loginUrl.searchParams.set('returnUrl', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If no auth cookie exists, skip remote network call to prevent waterfall latency for anonymous visitors
  if (!hasAuthCookie) {
    return supabaseResponse;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  // Validates user and refreshes expired tokens in cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (pathname === '/kabinet' || pathname.startsWith('/kabinet/') || pathname === '/diyoration' || pathname.startsWith('/diyoration/'))) {
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
