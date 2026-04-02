import { createClient } from "@supabase/supabase-js"

export function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.")
  }
  if (!anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada.")
  }

  return createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

