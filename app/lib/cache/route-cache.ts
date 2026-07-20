import type { SupabaseClient } from '@supabase/supabase-js'

// Shared cache for AI-generated readings (Numerology, Dasha Fal, Bhavishya Fal,
// Shubh Ashubh). Each feature computes its own `cacheKey` — a string that changes
// only when the underlying inputs change (e.g. today's date, or the chart's
// created_at). If the stored cache_key still matches, we skip the Groq call
// entirely and return the cached payload.
//
// Requires a `feature_cache` table with a UNIQUE (user_id, feature) constraint —
// see the SQL migration provided alongside this file.

export async function getCached<T = any>(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
  cacheKey: string
): Promise<T | null> {
  const { data, error } = await supabase
    .from('feature_cache')
    .select('payload, cache_key')
    .eq('user_id', userId)
    .eq('feature', feature)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error(`Cache read error (${feature}):`, error)
  }
  if (data && data.cache_key === cacheKey) return data.payload as T
  return null
}

export async function setCached(
  supabase: SupabaseClient,
  userId: string,
  feature: string,
  cacheKey: string,
  payload: unknown
): Promise<void> {
  const { error } = await supabase
    .from('feature_cache')
    .upsert(
      { user_id: userId, feature, cache_key: cacheKey, payload, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,feature' }
    )
  if (error) console.error(`Cache write error (${feature}):`, error)
}