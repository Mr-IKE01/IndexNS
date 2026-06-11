import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession, COOKIE_NAME } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/auth/') || pathname === '/login') {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get(COOKIE_NAME)

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const valid = await verifySession(sessionCookie.value)

  if (!valid) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
