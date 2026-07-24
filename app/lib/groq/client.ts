import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

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