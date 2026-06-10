import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifySession, COOKIE_NAME } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export default async function Home() {
  // Double-check auth (middleware handles this but belt-and-suspenders)
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  if (!session?.value || !(await verifySession(session.value))) {
    redirect('/login')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          SuiNS Indexer
        </h1>
        <p className="text-zinc-500 text-sm">
          Phase 2 complete — auth working
        </p>
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="outline"
            className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
          >
            Sign out
          </Button>
        </form>
      </div>
    </main>
  )
}
