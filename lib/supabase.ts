import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ''

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function assertSupabaseEnv() {
  if (!isValidHttpUrl(supabaseUrl)) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL inválida ou ausente. Use a Project URL (https://…) em Settings → API no .env.local ou .env.',
    )
  }
  if (!supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY ausente. Copie a anon public key em Settings → API no Supabase.',
    )
  }
}

assertSupabaseEnv()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)