// Simple in-memory sliding-window rate limiter. Per-instance only (resets on
// cold start, not shared across serverless instances) — good enough to stop a
// single client hammering an expensive Groq-backed route, not a substitute for
// an edge/WAF-level limiter if abuse becomes a real problem at scale.
//
// Fine for now — if you outgrow it (multiple serverless instances actually
// running concurrently, or real abuse patterns), that's when you'd move to a
// Redis/Upstash-backed limiter shared across instances instead of this Map.

const buckets = new Map<string, number[]>()

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const timestamps = (buckets.get(key) ?? []).filter(t => now - t < windowMs)

  if (timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - timestamps[0])
    buckets.set(key, timestamps)
    return { allowed: false, retryAfterMs }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)
  return { allowed: true, retryAfterMs: 0 }
}