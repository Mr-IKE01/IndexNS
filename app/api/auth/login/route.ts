import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { validateToken, createSession, COOKIE_NAME } from '@/lib/auth'

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }

  const { token } = body as { token?: unknown }

  if (!token || typeof token !== 'string') {
    return NextResponse.json(
      { error: 'Token is required' },
      { status: 400 }
    )
  }

  // Small fixed delay to prevent timing-based token enumeration
  await new Promise((resolve) => setTimeout(resolve, 150))

  if (!validateToken(token)) {
    return NextResponse.json(
      { error: 'Invalid access token' },
      { status: 401 }
    )
  }

  const session = await createSession()
  const cookieStore = await cookies()

  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return NextResponse.json({ success: true })
}
