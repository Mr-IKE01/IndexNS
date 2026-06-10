import { createClient } from '@supabase/supabase-js'

// Bypasses RLS entirely — only use in API routes, never in browser
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
    }
