import { supabase } from './supabase'
import { setMyStatusOffline } from './profile'

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

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
}