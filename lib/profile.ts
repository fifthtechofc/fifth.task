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

export async function updateMyProfileDetails(params: {
  birthday?: string | null
  jobTitle?: string | null
  bio?: string | null
  workHours?: string | null
}) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Usuário não autenticado.')
  }

  const payload: Record<string, unknown> = {}
  if (params.birthday !== undefined) payload.birthday = params.birthday
  if (params.jobTitle !== undefined) payload.job_title = params.jobTitle
  if (params.bio !== undefined) payload.bio = params.bio
  if (params.workHours !== undefined) payload.work_hours = params.workHours

  if (Object.keys(payload).length === 0) return

  const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
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

export async function setMyStatusOffline() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return
  }

  // Marca explicitamente como offline; deriveStatusFromActivity respeita isso.
  await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ status: 'offline' } as any)
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
  birthday?: string | null
  workHours?: string | null
  bio?: string | null
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
  // Tratamos apenas "online" e "focus" como estados explícitos fortes.
  // "offline" não bloqueia o cálculo por atividade – isso permite que o
  // usuário volte a ficar online após logar novamente.
  if (explicit === 'online' || explicit === 'focus') {
    return explicit as TeamMember['status']
  }

  const activity =
    parseDateMaybe(row.last_seen_at) ??
    parseDateMaybe(row.last_active_at) ??
    parseDateMaybe(row.last_sign_in_at) ??
    parseDateMaybe(row.updated_at)

  if (!activity) return 'offline'

  const minutes = (Date.now() - activity.getTime()) / 60000
  // Até 1 minuto desde a última atividade: online (verde)
  if (minutes <= 1) return 'online'
  // Entre 1 minuto e 2 horas: foco (amarelo)
  if (minutes <= 120) return 'focus'
  // Acima de 2 horas ou sem atividade: offline (cinza)
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
      // Descrição exibida na tela de Times deve refletir o cargo,
      // e não a bio pessoal (que é mostrada apenas no modal/perfil).
      const description = getJobTitleDescription(role) || ''
      const status = deriveStatusFromActivity(row)
      const birthday = coalesceString(row.birthday)
      const workHours = coalesceString(row.work_hours)
      const bio = coalesceString(row.bio)

      return {
        id,
        name,
        username: username || undefined,
        imageSrc,
        description: description || undefined,
        role: role || undefined,
        status,
        birthday: birthday || null,
        workHours: workHours || null,
        bio: bio || null,
      } satisfies TeamMember
    }),
  )

  const cleaned = mapped.filter((m) => m.id)

  // Ordena por status: online > focus > offline, depois por nome.
  const statusWeight: Record<NonNullable<TeamMember['status']>, number> = {
    online: 0,
    focus: 1,
    offline: 2,
  }

  cleaned.sort((a, b) => {
    const wa = statusWeight[a.status ?? 'offline']
    const wb = statusWeight[b.status ?? 'offline']
    if (wa !== wb) return wa - wb
    return a.name.localeCompare(b.name)
  })

  return cleaned
}