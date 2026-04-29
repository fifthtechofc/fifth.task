type Entry = {
  actionLink: string
  createdAt: number
}

const pending = new Map<string, Entry>()

const TTL_MS = 30 * 60_000 // 30 minutes

function key(email: string) {
  return email.trim().toLowerCase()
}

export function savePendingEmailConfirmation(
  email: string,
  actionLink: string,
) {
  const k = key(email)
  if (!k || !actionLink) return
  pending.set(k, { actionLink, createdAt: Date.now() })
}

export function getPendingEmailConfirmation(email: string) {
  const k = key(email)
  const v = pending.get(k)
  if (!v) return null
  if (Date.now() - v.createdAt > TTL_MS) {
    pending.delete(k)
    return null
  }
  return v
}
