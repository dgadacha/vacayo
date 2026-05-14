import { collection, doc, writeBatch, Timestamp } from 'firebase/firestore'
import { db, COL } from './firebase'

const TYPE_TO_KEY = { hotel: 'hotels', restaurant: 'restaurants', activity: 'activities' }
const KEY_TO_TYPE = { hotels: 'hotel', restaurants: 'restaurant', activities: 'activity' }

function serializeTimestamp(ts) {
  if (!ts) return null
  if (typeof ts === 'string') return ts
  if (typeof ts.seconds === 'number') return { seconds: ts.seconds, nanoseconds: ts.nanoseconds || 0 }
  if (ts instanceof Date) return { seconds: Math.floor(ts.getTime() / 1000), nanoseconds: 0 }
  return null
}

function parseTimestamp(value) {
  if (!value) return null
  if (typeof value === 'string') {
    const d = new Date(value)
    if (isNaN(d.getTime())) return null
    return Timestamp.fromDate(d)
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Timestamp(value.seconds, value.nanoseconds || 0)
  }
  return null
}

function serializeActivity(a) {
  const out = {}
  Object.entries(a).forEach(([k, v]) => {
    if (v && typeof v === 'object' && typeof v.seconds === 'number') {
      out[k] = serializeTimestamp(v)
    } else {
      out[k] = v
    }
  })
  return out
}

export function exportTrip(trip, items) {
  const grouped = { hotels: [], restaurants: [], activities: [] }
  items.forEach(a => {
    const key = TYPE_TO_KEY[a.type] || 'activities'
    grouped[key].push(serializeActivity(a))
  })
  return {
    schemaVersion: '1.1',
    trip: {
      name: trip.name || '',
      destination: trip.destination || '',
      country: trip.country || '',
      startDate: trip.startDate || '',
      endDate: trip.endDate || '',
      currency: trip.currency || 'EUR',
      currencySymbol: trip.currencySymbol || '€',
      budget: Number(trip.budget) || 0,
      coverImage: trip.coverImage || ''
    },
    tripName: trip.name || '',
    tripId: trip.id,
    hotels: grouped.hotels,
    restaurants: grouped.restaurants,
    activities: grouped.activities,
    exportDate: new Date().toISOString()
  }
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function safeFilename(name) {
  const base = String(name || 'voyage').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'voyage'
  const date = new Date().toISOString().slice(0, 10)
  return `vacayo-${base}-${date}.json`
}

function normalizeActivity(raw, type, tripId, uid) {
  const payload = {
    tripId,
    type,
    name: String(raw.name || '').trim() || 'Sans nom',
    city: raw.city || '',
    category: raw.category || '',
    price: Number(raw.price) || 0,
    date: raw.date || '',
    endDate: raw.endDate || '',
    notes: raw.notes || '',
    photoUrl: raw.photoUrl || '',
    bookingUrl: raw.bookingUrl || '',
    googleMapsUrl: raw.googleMapsUrl || '',
    priority: ['must-do', 'high', 'normal'].includes(raw.priority) ? raw.priority : 'normal',
    isDone: !!raw.isDone,
    isBooked: !!raw.isBooked,
    createdBy: uid
  }
  const ts = parseTimestamp(raw.createdAt)
  if (ts) payload.createdAt = ts
  return payload
}

export async function importTrip(json, { tripsStore, uid, onProgress } = {}) {
  if (!json || typeof json !== 'object') throw new Error('JSON invalide')
  if (!uid) throw new Error('Non connecté')

  const tripMeta = json.trip || {
    name: json.tripName || 'Voyage importé',
    destination: '',
    country: '',
    startDate: '',
    endDate: '',
    currency: 'EUR',
    currencySymbol: '€',
    budget: 0,
    coverImage: ''
  }
  if (!tripMeta.name) tripMeta.name = json.tripName || 'Voyage importé'

  const items = []
  ;['hotels', 'restaurants', 'activities'].forEach(key => {
    const arr = Array.isArray(json[key]) ? json[key] : []
    const type = KEY_TO_TYPE[key]
    arr.forEach(raw => items.push({ raw, type }))
  })
  // Also accept a flat items[] or activities[] with type field
  if (Array.isArray(json.items)) {
    json.items.forEach(raw => items.push({ raw, type: raw.type || 'activity' }))
  }

  onProgress?.({ phase: 'trip', current: 0, total: items.length })
  const newTrip = await tripsStore.createTrip(tripMeta)

  const BATCH_SIZE = 400
  let written = 0
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    slice.forEach(({ raw, type }) => {
      const ref = doc(collection(db, COL.activities))
      batch.set(ref, normalizeActivity(raw, type, newTrip.id, uid))
    })
    await batch.commit()
    written += slice.length
    onProgress?.({ phase: 'items', current: written, total: items.length })
  }

  return { tripId: newTrip.id, tripName: newTrip.name, count: written }
}
