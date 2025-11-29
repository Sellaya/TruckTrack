import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for driver routes - let driver routes handle their own auth
  if (pathname.startsWith('/driver')) {
    return NextResponse.next();
  }
  
  // Admin routes are accessible without restrictions
  // Admins should be able to access admin routes regardless of driver session
  // Driver session cookies won't block admin access to admin routes
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

