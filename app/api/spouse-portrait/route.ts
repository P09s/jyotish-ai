// app/api/spouse-portrait/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { groq, GROQ_MODEL } from '@/app/lib/groq/client'
import { getCached, setCached, chartFingerprint } from '@/app/lib/cache/route-cache'
import { InferenceClient } from '@huggingface/inference'
import { checkRateLimit } from '@/app/lib/rate-limit/rate-limit'

// The per-user cache already limits a given user to one HF image call per
// chart (see cacheKey below), but that's not the binding constraint — HF's
// free tier is a small credit pool SHARED ACROSS EVERY USER (see .env.example).
// A per-user limit alone doesn't stop 50 different users each cashing in
// their "one free call" the same afternoon and blowing the shared budget for
// everyone. So this route needs two layers:
//   1. Per-user: stops one account from grinding through gender variants /
//      chart regenerations.
//   2. Global: a single shared counter across all users, sized to the actual
//      HF quota. Tune GLOBAL_LIMIT to match whatever your HF plan allows —
//      this defaults conservatively to the free-tier number called out in
//      .env.example. Requires Upstash (UPSTASH_REDIS_REST_URL/TOKEN) to be
//      set for the global count to be real across serverless instances; the
//      in-memory fallback still helps on a single instance but won't hold
//      once you scale beyond one.
const SPOUSE_PORTRAIT_USER_LIMIT = 3
const SPOUSE_PORTRAIT_USER_WINDOW_MS = 24 * 60 * 60 * 1000       // per user, per day
const SPOUSE_PORTRAIT_GLOBAL_LIMIT = 3
const SPOUSE_PORTRAIT_GLOBAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // shared, per ~30 days

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

const SIGN_LORD: Record<string, string> = {
  Aries:'Mars', Taurus:'Venus', Gemini:'Mercury', Cancer:'Moon',
  Leo:'Sun', Virgo:'Mercury', Libra:'Venus', Scorpio:'Mars',
  Sagittarius:'Jupiter', Capricorn:'Saturn', Aquarius:'Saturn', Pisces:'Jupiter',
}

const EXALTATION: Record<string,string>   = { Sun:'Aries', Moon:'Taurus', Mars:'Capricorn', Mercury:'Virgo', Jupiter:'Cancer',    Venus:'Pisces', Saturn:'Libra' }
const DEBILITATION: Record<string,string> = { Sun:'Libra', Moon:'Scorpio', Mars:'Cancer',    Mercury:'Pisces', Jupiter:'Capricorn', Venus:'Virgo',  Saturn:'Aries' }
const OWN_SIGNS: Record<string,string[]>  = {
  Sun:['Leo'], Moon:['Cancer'], Mars:['Aries','Scorpio'], Mercury:['Gemini','Virgo'],
  Jupiter:['Sagittarius','Pisces'], Venus:['Taurus','Libra'], Saturn:['Capricorn','Aquarius'],
}

function getHouseLord(houseNum: number, lagnaSignIdx: number): string {
  const signIdx = (lagnaSignIdx + houseNum - 1) % 12
  return SIGN_LORD[SIGNS[signIdx]]
}

function getDignity(planetName: string, sign: string): string | null {
  if (EXALTATION[planetName] === sign) return 'Exalted'
  if (DEBILITATION[planetName] === sign) return 'Debilitated'
  if (OWN_SIGNS[planetName]?.includes(sign)) return 'Own sign (Swakshetra)'
  return null
}

function houseContext(houseNum: number, chart: any, lagnaSignIdx: number) {
  const lord = getHouseLord(houseNum, lagnaSignIdx)
  const lordPlanet = chart.planets?.find((p: any) => p.name === lord)
  const occupants = (chart.planets ?? [])
    .filter((p: any) => p.house === houseNum)
    .map((p: any) => p.name)

  return {
    house: houseNum,
    lord,
    lordCurrentHouse: lordPlanet?.house ?? null,
    lordSign: lordPlanet?.sign ?? null,
    lordDignity: lordPlanet ? getDignity(lord, lordPlanet.sign) : null,
    occupants,
  }
}

function describeHouse(label: string, ctx: ReturnType<typeof houseContext>) {
  return `${label} (House ${ctx.house}): lord is ${ctx.lord}, currently in house ${ctx.lordCurrentHouse} (${ctx.lordSign})${ctx.lordDignity ? ` — ${ctx.lordDignity}` : ''}. Occupied by: ${ctx.occupants.length ? ctx.occupants.join(', ') : 'no planets'}.`
}

// Venus (Shukra) = general relationship/romance significator for all charts.
// Mars (Mangal) = co-significator of spouse specifically for female charts in
// classical texts; we surface both and let the LLM weigh them contextually
// rather than branching on gender, which we don't reliably have.
function describePlanet(name: string, chart: any) {
  const p = chart.planets?.find((pl: any) => pl.name === name)
  if (!p) return `${name}: unavailable.`
  const dignity = getDignity(name, p.sign)
  return `${name}: house ${p.house}, sign ${p.sign}${dignity ? ` — ${dignity}` : ''}${p.isRetrograde ? ' (retrograde)' : ''}.`
}

export async function GET(request: Request) {
  try {
    // Same flag as the dashboard card — feature is complete but paused
    // until there's real budget for image-gen credits. Returning 404
    // rather than a "disabled" message so it doesn't advertise a paused
    // feature to anyone probing routes directly.
    if (process.env.NEXT_PUBLIC_SPOUSE_PORTRAIT_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userLimit = await checkRateLimit(`spouse-portrait:${user.id}`, SPOUSE_PORTRAIT_USER_LIMIT, SPOUSE_PORTRAIT_USER_WINDOW_MS)
    if (!userLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many portrait requests — please try again tomorrow.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(userLimit.retryAfterMs / 1000)) } }
      )
    }

    const { data: chartRow, error: chartErr } = await supabase
      .from('kundali_charts')
      .select('chart_data, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1).single()

    if (chartErr && chartErr.code !== 'PGRST116') {
      console.error('Spouse Portrait chart fetch error:', chartErr)
    }
    const chart = chartRow?.chart_data
    if (!chart) {
      return NextResponse.json({ error: 'Please generate your Kundali first.' }, { status: 400 })
    }

    // Gender wasn't factored in at all before, which let the model default
    // to whatever it liked — wrong more often than not, as we saw. An
    // explicit choice from the reveal screen is the most reliable source
    // (it doesn't assume orientation and doesn't depend on the profile's
    // gender field being filled in), so we prefer that. We fall back to
    // assuming opposite-gender pairing from the profile only if the request
    // doesn't specify — better than nothing, but the UI should always send it.
    const { searchParams } = new URL(request.url)
    const requestedGender = searchParams.get('gender')

    let spouseGender: string | null = null
    if (requestedGender === 'male' || requestedGender === 'female') {
      spouseGender = requestedGender
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', user.id)
        .single()

      spouseGender =
        profile?.gender === 'male' ? 'female' :
        profile?.gender === 'female' ? 'male' :
        null
    }

    const lagnaSignIdx = chart.lagna?.sign_index ?? 0

    // Same as bhavishya-fal: this only changes when the chart is regenerated,
    // so we key on the chart's own fingerprint, not a request param. This
    // also means a generation costs one Groq call + one image call per user,
    // ever (until they redo their kundali) — important given image cost.
    const cacheKey = `${chartFingerprint(chart)}:${spouseGender ?? 'unspecified'}`
    const cached = await getCached(supabase, user.id, 'spouse-portrait', cacheKey)
    if (cached) return NextResponse.json({ success: true, spousePortrait: cached })

    // Cache miss means we're about to spend real Groq + HF credits — this is
    // the one check that protects the shared HF pool, so it only counts
    // requests that actually reach here (cache hits above are free and don't
    // touch it).
    const globalLimit = await checkRateLimit('spouse-portrait:global', SPOUSE_PORTRAIT_GLOBAL_LIMIT, SPOUSE_PORTRAIT_GLOBAL_WINDOW_MS)
    if (!globalLimit.allowed) {
      return NextResponse.json(
        { error: 'Spouse Portrait has hit its generation budget for this period — please check back later.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(globalLimit.retryAfterMs / 1000)) } }
      )
    }

    const marriageHouse = houseContext(7, chart, lagnaSignIdx)

    const contextBlock = `Lagna: ${chart.lagna?.sign}
Moon Sign: ${chart.summary?.moon_sign}
Spouse gender: ${spouseGender ?? 'not specified — use your judgement, do not default to one gender arbitrarily'}
${describeHouse('Marriage & Spouse', marriageHouse)}
${describePlanet('Venus', chart)}
${describePlanet('Mars', chart)}`

    // ── Step 1: Groq derives traits + a stylized art-prompt from the chart ──
    // Deliberately asks for an ILLUSTRATION, not a photoreal face: (a) classical
    // jyotish speaks to temperament/build/vibe, not literal facial geometry, so
    // photoreal output would overclaim what the chart actually says, and
    // (b) a randomly-generated "real" human face risks resembling an actual
    // identifiable person. Structured JSON out so we can render the trait list
    // in the UI separately from the raw image prompt.
    const systemPrompt = `You are Daivam, a warm Vedic astrologer. Based on the 7th house (marriage house) lord's placement/dignity and Venus/Mars placement, describe the temperament, style, and energy classical jyotish associates with this person's future spouse. The spouse's gender is given in the input — always respect it in both the narrative and the image prompt; never default to a different gender.

Respond with ONLY valid JSON, no markdown fences, in this exact shape:
{
  "traits": {
    "temperament": "1 short phrase",
    "vibe": "1 short phrase, e.g. 'earthy and steady' or 'bold and independent'",
    "style": "1 short phrase about how they carry themselves / dress / presence",
    "complexion_tone": "1 short phrase using traditional descriptive language (e.g. 'warm wheatish', 'fair', 'deep and radiant') — never a specific ethnicity or nationality"
  },
  "narrative": "2-3 warm sentences, plain text, no markdown, weaving the traits above into a natural reading. Do not promise exact appearance or claim certainty — frame as tendencies the chart suggests.",
  "image_prompt": "A single descriptive prompt (40-70 words) for an AI illustration. MUST explicitly state the spouse's gender if given. MUST start with 'A loose gouache-and-ink editorial portrait illustration of a [gender] adult, painterly brushwork, muted earthy palette, semi-realistic proportions.' Describe general vibe/energy/styling/colors suggested by the traits (e.g. warm palette for a fiery Mars, flowing lines for a Venus-Pisces softness) rather than exact facial features. Never describe a specific real ethnicity, nationality, or any identifiable individual — keep it universal and artistic.",
  "negative_prompt": "A short comma-separated list of styles to avoid rendering in, always including: anime, cartoon, chibi, manga, 3d render, cgi, photorealistic, plastic skin"
}`

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_completion_tokens: 600,
      reasoning_effort: 'low',
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextBlock },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: { traits?: any; narrative?: string; image_prompt?: string; negative_prompt?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error('Spouse Portrait: failed to parse Groq JSON:', raw)
      return NextResponse.json({ error: 'Reading generation failed, please try again.' }, { status: 500 })
    }
    if (!parsed.image_prompt || !parsed.narrative) {
      return NextResponse.json({ error: 'Reading generation incomplete, please try again.' }, { status: 500 })
    }

    // ── Step 2: image generation ──
    // Uses Hugging Face's Inference Providers on the free tier. Requires
    // HF_TOKEN in env (a free Hugging Face account + access token with
    // "Inference Providers" permission: https://huggingface.co/settings/tokens).
    //
    // IMPORTANT: this hits router.huggingface.co's raw REST endpoint under
    // the "hf-inference" provider directly, which has been steadily
    // narrowed and no longer serves current-gen models like FLUX or SDXL —
    // confirmed by 404/410/400 responses even on official "recommended"
    // model IDs. The officially documented, currently-working path is the
    // @huggingface/inference SDK with provider: "auto", which lets Hugging
    // Face route the request to whichever partner (fal-ai, replicate, etc.)
    // currently serves that model. This still runs on your free monthly HF
    // inference credits, not a paid key — but it is a *metered* free tier
    // (a monthly credit allowance), not unlimited, unlike hf-inference used
    // to be. Worth monitoring usage on huggingface.co/settings/billing once
    // this feature gets real traffic.
    const hf = new InferenceClient(process.env.HF_TOKEN)

    const IMAGE_MODEL_CANDIDATES = [
      'black-forest-labs/FLUX.1-dev',
      'black-forest-labs/FLUX.1-schnell',
      'stabilityai/stable-diffusion-3.5-large',
    ]

    let imageBlob: Blob | null = null
    let lastError: unknown = null
    for (const model of IMAGE_MODEL_CANDIDATES) {
      try {
        imageBlob = await hf.textToImage(
          {
            model,
            inputs: parsed.image_prompt,
            provider: 'auto',
            parameters: {
              negative_prompt: parsed.negative_prompt,
            },
          },
          { outputType: 'blob' }
        )
        break
      } catch (err) {
        lastError = err
        console.warn(`Spouse Portrait: ${model} failed via auto-routed provider, trying next candidate`, err instanceof Error ? err.message : err)
        continue
      }
    }

    if (!imageBlob) {
      console.error('Spouse Portrait: all image model candidates failed:', lastError)
      return NextResponse.json({ error: 'Portrait generation is temporarily unavailable, please try again later.' }, { status: 502 })
    }

    // Content-type varies by model/provider, so we pass it through rather
    // than assuming PNG.
    const imageMimeType = imageBlob.type || 'image/png'
    const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())
    const imageB64 = imageBuffer.toString('base64')
    if (!imageB64) {
      return NextResponse.json({ error: 'Portrait generation returned no image.' }, { status: 502 })
    }

    // NOTE for production: base64 images are large (~1-2MB) for a jsonb cache
    // column. For an MVP this is fine, but once this ships, switch to
    // uploading to a Supabase Storage bucket and caching the resulting public
    // URL instead of the raw base64 — much cheaper to store and to serve.
    const spousePortrait = {
      traits: parsed.traits ?? {},
      narrative: parsed.narrative,
      imageBase64: imageB64,
      imageMimeType,
      disclaimer: 'An artistic impression based on classical jyotish placements — not a literal prediction of appearance.',
    }

    await setCached(supabase, user.id, 'spouse-portrait', cacheKey, spousePortrait)

    return NextResponse.json({ success: true, spousePortrait })
  } catch (err: unknown) {
    console.error('Spouse Portrait error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Generation failed' }, { status: 500 })
  }
}