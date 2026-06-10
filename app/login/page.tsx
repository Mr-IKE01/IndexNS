import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import LoginForm from './login-form'

export default async function LoginPage() {
  // If the user already has a valid session, send them home
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)

  if (session?.value) {
    const valid = await verifySession(session.value)
    if (valid) redirect('/')
  }

  return <LoginForm />
}
