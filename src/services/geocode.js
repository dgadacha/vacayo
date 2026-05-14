// Geocoding via Photon (komoot) — no API key, no rate limit, fast.
// Cached aggressively in localStorage to avoid re-fetching.

const CACHE_KEY = 'vacayo:geocode:v2'
const NEG_TTL_MS = 7 * 24 * 60 * 60 * 1000     // 7 days for negatives
const POS_TTL_MS = 365 * 24 * 60 * 60 * 1000   // 1 year for positives

function readCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') }
  catch { return {} }
}
let cacheBuffer = null
let cacheFlushTimer = null
function getCache() {
  if (!cacheBuffer) cacheBuffer = readCache()
  return cacheBuffer
}
function scheduleFlush() {
  if (cacheFlushTimer) return
  cacheFlushTimer = setTimeout(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cacheBuffer || {})) } catch {}
    cacheFlushTimer = null
  }, 200)
}

async function photon(query, signal) {
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=1`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const f = data.features?.[0]
  if (!f) return null
  const [lng, lat] = f.geometry.coordinates
  return { lat, lng, displayName: f.properties?.name || query }
}

// Generate query variations for a single raw city.
// Examples:
//   "Tokyo - Ikebukuro" => ["Ikebukuro, Tokyo", "Tokyo - Ikebukuro"]
//   "Sapporo - Odori"   => ["Odori, Sapporo", "Sapporo - Odori"]
//   "Sapporo"           => ["Sapporo"]
function variations(city) {
  const parts = city.split(/\s*[-–—]\s*/).map(s => s.trim()).filter(Boolean)
  if (parts.length > 1) {
    return [parts.slice().reverse().join(', '), city]
  }
  return [city]
}

export async function geocodeCity(rawCity, { signal } = {}) {
  if (!rawCity) return null
  const city = String(rawCity).trim()
  if (!city) return null
  const key = city.toLowerCase()
  const cache = getCache()
  const hit = cache[key]
  const now = Date.now()
  if (hit) {
    if (hit.lat != null && now - hit.t < POS_TTL_MS) return { lat: hit.lat, lng: hit.lng, displayName: hit.d }
    if (hit.lat == null && now - hit.t < NEG_TTL_MS) return null
  }

  for (const q of variations(city)) {
    try {
      const r = await photon(q, signal)
      if (r) {
        cache[key] = { lat: r.lat, lng: r.lng, d: r.displayName, t: now }
        scheduleFlush()
        return r
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e
      console.warn('Photon failed for', q, e?.message)
    }
  }

  cache[key] = { lat: null, t: now }
  scheduleFlush()
  return null
}

// Parallel batched geocoding with progressive callback.
// onProgress(done, total, city, result) fires as each city resolves.
export async function geocodeMany(cities, onProgress, { concurrency = 6, signal } = {}) {
  const results = {}
  let done = 0
  const queue = [...cities]

  async function worker() {
    while (queue.length > 0) {
      if (signal?.aborted) return
      const c = queue.shift()
      let r = null
      try { r = await geocodeCity(c, { signal }) }
      catch (e) { if (e.name === 'AbortError') return }
      results[c] = r
      done++
      try { onProgress?.(done, cities.length, c, r) } catch {}
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
  return results
}

// Pre-warm cache: fire-and-forget background geocoding.
export function prewarm(cities) {
  if (!Array.isArray(cities) || cities.length === 0) return
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => geocodeMany(cities, null, { concurrency: 4 }), { timeout: 2000 })
  } else {
    setTimeout(() => geocodeMany(cities, null, { concurrency: 4 }), 1500)
  }
}
