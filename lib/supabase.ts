import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

function assertSupabaseEnv() {
  if (!isValidHttpUrl(supabaseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL inválida ou ausente. Use a Project URL (https://…) em Settings → API no .env.local ou .env.",
    )
  }
  if (!supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente. Copie a anon public key em Settings → API no Supabase.",
    )
  }
}

assertSupabaseEnv()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

function isAuthLockAbort(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : String(error ?? "")

  return message.includes("AbortError") || message.includes("steal")
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getSupabaseSessionSnapshot() {
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session ?? null
    } catch (error) {
      lastError = error
      if (!isAuthLockAbort(error) || attempt === 1) break
      await sleep(120)
    }
  }

  if (lastError) {
    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  return null
}

export async function getSupabaseUserId() {
  const session = await getSupabaseSessionSnapshot()
  return session?.user?.id?.trim() || null
}
