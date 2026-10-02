import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('teddy_token')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith('/login');
  const isDashboardRoute = pathname.startsWith('/dashboard') ||
    pathname.startsWith('/bookings') || pathname.startsWith('/calendar') ||
    pathname.startsWith('/services') || pathname.startsWith('/messages') ||
    pathname.startsWith('/analytics') || pathname.startsWith('/settings');

  if (isDashboardRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
