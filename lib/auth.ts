import { supabase } from './supabase'
import { setMyStatusOffline } from './profile'
import { logAuditEvent } from './audit'

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  void logAuditEvent({ action: 'auth.login', metadata: { method: 'password' } })
  return data
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
  jobTitle: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name.trim(),
        job_title: jobTitle.trim(),
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function requestPasswordReset(email: string, redirectTo?: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function exchangeCodeForSession(code: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function setSessionFromTokens(params: {
  accessToken: string
  refreshToken: string
}) {
  const { data, error } = await supabase.auth.setSession({
    access_token: params.accessToken,
    refresh_token: params.refreshToken,
  })
  if (error) {
    throw new Error(error.message)
  }
  return data
}

export async function updateMyPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw new Error(error.message)
  }
  void logAuditEvent({ action: 'auth.password_change' })
  return data
}

export async function signOutUser() {
  try {
    // Best-effort: marca o usuário como offline antes de sair.
    await setMyStatusOffline()
  } catch {
    // não bloqueia o logout em caso de erro
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }

  void logAuditEvent({ action: 'auth.logout' })
}