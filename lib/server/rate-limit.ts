type Bucket = {
  tokens: number
  updatedAt: number
}

const buckets = new Map<string, Bucket>()

export type RateLimitConfig = {
  /** Maximum requests per window. */
  limit: number
  /** Window size in milliseconds. */
  windowMs: number
}

export function rateLimit(key: string, cfg: RateLimitConfig) {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { tokens: cfg.limit, updatedAt: now }

  // refill tokens based on elapsed time
  const elapsed = now - bucket.updatedAt
  const refill = (elapsed / cfg.windowMs) * cfg.limit
  const tokens = Math.min(cfg.limit, bucket.tokens + refill)

  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now })
    return { ok: false as const, remaining: 0, resetAt: bucket.updatedAt + cfg.windowMs }
  }

  const next = { tokens: tokens - 1, updatedAt: now }
  buckets.set(key, next)
  return {
    ok: true as const,
    remaining: Math.max(0, Math.floor(next.tokens)),
    resetAt: now + cfg.windowMs,
  }
}

export function getClientIp(headers: Headers) {
  const xf = headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (xf) return xf
  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return 'unknown'
}

