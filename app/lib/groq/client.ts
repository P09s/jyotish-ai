import Groq from 'groq-sdk'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

// llama-3.1-8b-instant = fastest, most free-tier friendly
// llama-3.3-70b-versatile = smarter but burns tokens faster
export const GROQ_MODEL = 'llama-3.1-8b-instant'