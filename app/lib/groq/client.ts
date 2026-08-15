import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

// Every GROQ_MODEL-backed route (numerology, dasha-fal, bhavishya-fal,
// shubh-ashubh, milan) was catching Groq errors with `err.message`, which
// for a Groq APIError is the raw provider JSON — exactly what chat/route.ts
// used to leak to the screen on a rate limit before that got fixed. All five
// of those routes share this single GROQ_MODEL's daily budget, so a traffic
// spike hitting that shared pool would surface the same raw JSON on any of
// them. Route catch blocks should call this instead of building their own
// error message from a caught Groq error.
export function classifyGroqError(err: unknown): { message: string; status: number } {
  if (err instanceof Groq.APIError) {
    const code = (err.error as { code?: string } | undefined)?.code
    if (code === 'rate_limit_exceeded') {
      // 413 = this single request's own size exceeded the per-minute
      // ceiling outright; 429 = the model's budget window is exhausted.
      // Different root cause, so different (still honest) message.
      return err.status === 413
        ? { message: 'That request was too large to process right now. Please try again.', status: 413 }
        : { message: 'This feature is experiencing high demand right now. Please try again in a few minutes.', status: 429 }
    }
  }
  return { message: 'Something went wrong generating this reading. Please try again.', status: 500 }
}

// NOTE: llama-3.1-8b-instant and llama-3.3-70b-versatile (the models this
// file used previously) were both deprecated by Groq on 06/17/26, shutting
// down 08/16/26. Using their official recommended replacements below —
// see https://console.groq.com/docs/deprecations

// openai/gpt-oss-20b — fastest, most free-tier friendly. Used for the
// structured, template-driven, cache-backed routes (dasha-fal, bhavishya-fal,
// shubh-ashubh, numerology, milan) where the real depth comes from the
// grounded data injected into the prompt, not from the model's own synthesis.
export const GROQ_MODEL = 'openai/gpt-oss-20b'

// openai/gpt-oss-120b — smarter but burns tokens faster. Reserved for the
// open-ended chat route, the one surface where a small model's tendency
// toward generic filler and formulaic "let me know if you'd like to explore
// further!" endings is most noticeable and most costly to the user's trust.
// Chat cost is bounded by rate limiting (see app/lib/rate-limit), not caching,
// so it can afford the heavier model.
export const GROQ_MODEL_CHAT = 'openai/gpt-oss-120b'

// ── Chat fallback chain ──────────────────────────────────────────────────────
// Groq's free tier enforces rate limits PER MODEL (30 RPM / 1K RPD / 8K TPM /
// 200K TPD each, per console.groq.com/docs/rate-limits — verified 2026-08),
// not one shared pool across every model. So once the primary chat model's
// budget for the day is genuinely exhausted, falling through to a different
// model gets you a second (and third) independent budget for free, instead
// of just telling users to come back tomorrow.
//
// qwen/qwen3.6-27b is Groq's own recommended same-tier replacement for the
// retiring llama-3.3-70b-versatile, and — unlike openai/gpt-oss-20b — it
// doesn't share a budget with the reading routes (dasha-fal, numerology,
// etc., which all use GROQ_MODEL), so it's the fallback with zero blast
// radius on the rest of the app. openai/gpt-oss-20b is listed last: it works
// as a final fallback, but using it here does compete with those routes'
// shared 200K/day pool, so it's only worth spending once the dedicated
// options are gone too.
//
// `supportsReasoningEffort` matters because `reasoning_effort` is specific to
// OpenAI's gpt-oss reasoning models — passing it to a model that doesn't
// support the param risks an API validation error, so createChatCompletion-
// WithFallback only sets it per-model instead of unconditionally.
export const GROQ_CHAT_MODEL_CHAIN: { model: string; supportsReasoningEffort: boolean }[] = [
  { model: 'openai/gpt-oss-120b', supportsReasoningEffort: true },
  { model: 'qwen/qwen3.6-27b',    supportsReasoningEffort: false },
  { model: 'openai/gpt-oss-20b',  supportsReasoningEffort: true },
]

// Groq returns `retry-after` (seconds) on a 429. A short retry-after means we
// hit the per-minute (TPM) window, which resets on its own shortly — worth a
// brief wait-and-retry on the SAME model so a normal, lively conversation
// doesn't have its "voice" flip between models over a transient minute-window
// bump. A long retry-after means the daily (TPD) budget for that model is
// actually spent, which is what the fallback chain is really for.
const RATE_LIMIT_SHORT_WAIT_THRESHOLD_S = 10
const MAX_SAME_MODEL_RETRIES = 1

export async function createChatCompletionWithFallback(params: {
  messages: Groq.Chat.Completions.ChatCompletionMessageParam[]
  maxCompletionTokens: number
  temperature: number
}): Promise<{
  stream: AsyncIterable<Groq.Chat.Completions.ChatCompletionChunk>
  modelUsed: string
  usedFallback: boolean
}> {
  let lastError: unknown = null

  for (let i = 0; i < GROQ_CHAT_MODEL_CHAIN.length; i++) {
    const { model, supportsReasoningEffort } = GROQ_CHAT_MODEL_CHAIN[i]

    for (let attempt = 0; attempt <= MAX_SAME_MODEL_RETRIES; attempt++) {
      try {
        const stream = await groq.chat.completions.create({
          model,
          max_completion_tokens: params.maxCompletionTokens,
          ...(supportsReasoningEffort ? { reasoning_effort: 'low' as const } : {}),
          temperature: params.temperature,
          stream: true,
          messages: params.messages,
        })
        return { stream, modelUsed: model, usedFallback: i > 0 }
      } catch (err) {
        lastError = err
        // Groq returns a 429 (RateLimitError) when a model's daily/minute
        // budget is genuinely exhausted, but a 413 ("Request too large")
        // when a single request's own size (input + reserved completion
        // tokens) exceeds the TPM ceiling outright — same underlying limit,
        // different HTTP status, so checking the body's error code catches
        // both instead of just the 429 case. Anything else (auth, bad
        // request, outage) will fail identically on every model in the
        // chain — don't waste time working through the whole list for a
        // non-rate-limit error, just surface it immediately.
        const isRateLimitLike = err instanceof Groq.APIError && (err.error as { code?: string } | undefined)?.code === 'rate_limit_exceeded'
        if (!isRateLimitLike) throw err

        // Groq only sends retry-after on 429s, not 413s — a 413 is a fixed
        // "this request is too big" fact, not a temporal window, so waiting
        // doesn't help and retryAfterS naturally comes back NaN here,
        // correctly skipping straight to the next model below.
        const retryAfterS = parseInt(err.headers?.get('retry-after') ?? '', 10)
        const isShortWait = Number.isFinite(retryAfterS) && retryAfterS > 0 && retryAfterS <= RATE_LIMIT_SHORT_WAIT_THRESHOLD_S

        if (isShortWait && attempt < MAX_SAME_MODEL_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, retryAfterS * 1000))
          continue // retry the same model — likely just a per-minute window
        }
        break // move to the next model in the chain
      }
    }
  }

  throw lastError ?? new Error('All chat models exhausted')
}