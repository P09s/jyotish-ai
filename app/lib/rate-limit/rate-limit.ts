// Sliding-window rate limiter with two backends:
//
// - No UPSTASH_REDIS_REST_URL/TOKEN set → falls back to the original
//   in-memory Map. Per-instance only (resets on cold start, not shared
//   across serverless instances) — fine for a single-instance deploy or low
//   traffic, not a real guarantee once multiple instances run concurrently.
// - Both env vars set → uses Upstash Redis, so the limit is enforced
//   globally across every instance. Same function signature either way, so
//   no call site needs to change when you add the env vars later.
//
// Create a free Upstash Redis database at https://console.upstash.com,
// then copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN into env.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

// Upstash's Ratelimit instances are configured with a fixed limit/window at
// construction time, but call sites here pass different limits per feature
// (chat: 20/5min, geocode: 30/1min) — so we cache one instance per distinct
// (limit, windowMs) pair instead of constructing a new one on every request.
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${Math.max(1, Math.round(windowMs / 1000))} s`),
      prefix: 'daivam-ratelimit',
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

const memoryBuckets = new Map<string, number[]>()

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const timestamps = (memoryBuckets.get(key) ?? []).filter(t => now - t < windowMs)

  if (timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - timestamps[0])
    memoryBuckets.set(key, timestamps)
    return { allowed: false, retryAfterMs }
  }

  timestamps.push(now)
  memoryBuckets.set(key, timestamps)
  return { allowed: true, retryAfterMs: 0 }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterMs: number }> {
  if (redis) {
    const limiter = getLimiter(limit, windowMs)
    const { success, reset } = await limiter.limit(key)
    return { allowed: success, retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()) }
  }
  return checkMemoryRateLimit(key, limit, windowMs)
}