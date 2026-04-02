import { supabase } from '@/lib/supabase'

const DEVICE_ID_KEY = 'ft:deviceId'

function randomId() {
  // not a secret, just an identifier
  return `${crypto.randomUUID()}-${Math.random().toString(16).slice(2)}`
}

export function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return null
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY)
    if (existing && existing.trim().length >= 10) return existing.trim()
    const next = randomId()
    window.localStorage.setItem(DEVICE_ID_KEY, next)
    return next
  } catch {
    return null
  }
}

export async function registerMyDeviceSession(maxSessions = 3) {
  const deviceId = getOrCreateDeviceId()
  if (!deviceId) return { ok: false as const, error: 'device_id_unavailable' }

  const { error } = await supabase.rpc('register_device_session', {
    p_device_id: deviceId,
    p_max_sessions: maxSessions,
  })

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, deviceId }
}

export async function isMyDeviceSessionActive() {
  const deviceId = getOrCreateDeviceId()
  if (!deviceId) return { ok: true as const, active: true }

  const { data, error } = await supabase.rpc('is_device_session_active', {
    p_device_id: deviceId,
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, active: Boolean(data) }
}

