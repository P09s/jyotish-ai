import { describe, it, expect } from 'vitest'
import { checkRateLimit } from './rate-limit'

// No UPSTASH_REDIS_REST_URL/TOKEN in the test env, so these exercise the
// in-memory fallback path specifically.

describe('checkRateLimit (in-memory fallback)', () => {
  it('allows requests up to the limit', async () => {
    const key = `test-${Date.now()}-a`
    for (let i = 0; i < 3; i++) {
      const { allowed } = await checkRateLimit(key, 3, 60_000)
      expect(allowed).toBe(true)
    }
  })

  it('rejects once the limit is exceeded, with a positive retry-after', async () => {
    const key = `test-${Date.now()}-b`
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(key, 3, 60_000)
    }
    const result = await checkRateLimit(key, 3, 60_000)
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeGreaterThan(0)
  })

  it('tracks separate keys independently', async () => {
    const keyA = `test-${Date.now()}-c1`
    const keyB = `test-${Date.now()}-c2`
    await checkRateLimit(keyA, 1, 60_000)
    const resultA = await checkRateLimit(keyA, 1, 60_000)
    const resultB = await checkRateLimit(keyB, 1, 60_000)
    expect(resultA.allowed).toBe(false)
    expect(resultB.allowed).toBe(true)
  })
})
