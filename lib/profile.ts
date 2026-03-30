import { supabase } from './supabase'
import { getAvatarPublicUrl } from './storage'
import { getJobTitleDescription } from './job-titles'

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Usuário não autenticado.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function updateMyProfileAvatar(avatarUrl: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Usuário não autenticado.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function touchMyPresence() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return
  }

  const now = new Date().toISOString()

  // Try to write activity timestamp if the column exists.
  {
    const { error } = await supabase
      .from('profiles')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ last_seen_at: now } as any)
      .eq('id', user.id)

    if (!error) return

    // If the column doesn't exist, fall back to updating status.
    const msg = (error as { message?: string }).message ?? ''
    const missingLastSeen =
      msg.toLowerCase().includes('last_seen_at') &&
      (msg.toLowerCase().includes('column') || msg.toLowerCase().includes('schema'))

    if (!missingLastSeen) {
      return
    }
  }

  await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ status: 'online' } as any)
    .eq('id', user.id)
}

export type TeamMember = {
  id: string
  name: string
  username?: string
  imageSrc: string
  description?: string
  role?: string
  status?: 'online' | 'focus' | 'offline'
}

function coalesceString(...values: Array<unknown>) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function parseDateMaybe(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  return Number.isFinite(d.getTime()) ? d : null
}

function deriveStatusFromActivity(row: Record<string, unknown>): TeamMember['status'] | undefined {
  const explicit = coalesceString(row.status).toLowerCase()
  if (explicit === 'online' || explicit === 'focus' || explicit === 'offline') {
    return explicit as TeamMember['status']
  }

  const activity =
    parseDateMaybe(row.last_seen_at) ??
    parseDateMaybe(row.last_active_at) ??
    parseDateMaybe(row.last_sign_in_at) ??
    parseDateMaybe(row.updated_at)

  if (!activity) return 'offline'

  const minutes = (Date.now() - activity.getTime()) / 60000
  if (minutes <= 15) return 'online'
  if (minutes <= 120) return 'focus'
  return 'offline'
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from('profiles').select('*')

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>

  const mapped = await Promise.all(
    rows.map(async (row) => {
      const id = String(row.id ?? '')
      const name = coalesceString(row.full_name, row.name, row.display_name, row.email, 'Sem nome')
      const username = coalesceString(row.username)

      const directAvatar = coalesceString(row.avatar_url, row.avatarUrl, row.avatar)
      let imageSrc = directAvatar

      if (!imageSrc && id) {
        try {
          const { publicUrl } = await getAvatarPublicUrl(id)
          imageSrc = publicUrl ?? ''
        } catch {
          imageSrc = ''
        }
      }

      const role = coalesceString(row.job_title, row.role)
      const description = coalesceString(row.description, row.bio) || getJobTitleDescription(role) || ''
      const status = deriveStatusFromActivity(row)

      return {
        id,
        name,
        username: username || undefined,
        imageSrc,
        description: description || undefined,
        role: role || undefined,
        status,
      } satisfies TeamMember
    }),
  )

  return mapped.filter((m) => m.id)
}