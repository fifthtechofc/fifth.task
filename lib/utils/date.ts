export function getTimeRemaining(dueDate?: string | null) {
  if (!dueDate) return "NO DEADLINE"

  const due = new Date(dueDate)
  if (!Number.isFinite(due.getTime())) return "NO DEADLINE"

  const diffMs = due.getTime() - Date.now()
  if (diffMs < 0) return "OVERDUE"

  const dayMs = 1000 * 60 * 60 * 24
  const diffDays = Math.ceil(diffMs / dayMs)

  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? "DAY" : "DAYS"} LEFT`
  }

  const diffWeeks = Math.ceil(diffDays / 7)
  return `${diffWeeks} ${diffWeeks === 1 ? "WEEK" : "WEEKS"} LEFT`
}

export function getProjectAgeLabel(createdAt?: string | null) {
  if (!createdAt) return "0 DAYS"

  const created = new Date(createdAt)
  if (!Number.isFinite(created.getTime())) return "0 DAYS"

  const diffMs = Date.now() - created.getTime()
  const dayMs = 1000 * 60 * 60 * 24
  const diffDays = Math.max(0, Math.floor(diffMs / dayMs))

  return `${diffDays} ${diffDays === 1 ? "DAY" : "DAYS"}`
}
