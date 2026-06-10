import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, COOKIE_NAME } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let auth API routes and the login page through unconditionally
  if (
    pathname.startsWith('/api/auth/') ||
    pathname === '/login'
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)

  // No cookie at all → redirect to login
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Cookie exists but may be invalid/expired → verify
  const valid = await verifySession(sessionCookie.value)

  if (!valid) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    // Clear the bad cookie
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run on all routes except:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
