type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

import { supabase } from '@/lib/supabase'

async function postJson<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as any
  if (!res.ok || !json?.ok) {
    return { ok: false, error: String(json?.error ?? 'Não foi possível concluir.') }
  }
  return { ok: true, data: json.data as T }
}

export async function httpSignInWithEmail(email: string, password: string) {
  const result = await postJson<any>('/api/auth/signin', { email, password })
  if (!result.ok) return result

  const session = result.data?.session
  if (session?.access_token && session?.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error) {
      return { ok: false as const, error: error.message }
    }
  }

  return result
}

export async function httpSignUpWithEmail(
  email: string,
  password: string,
  name: string,
  jobTitle: string,
) {
  const result = await postJson<any>('/api/auth/signup', { email, password, name, jobTitle })
  if (!result.ok) return result

  return result
}

export async function httpRequestPasswordReset(email: string, redirectTo: string) {
  return postJson('/api/auth/forgot-password', { email, redirectTo })
}

