// Dry-run: parse the user's Japon JSON exactly like the import flow would
// and confirm the count + first normalized item, without writing to Firestore.
import { readFileSync } from 'node:fs'

const json = JSON.parse(readFileSync('/Users/dylan/Downloads/vacayo-japon-2025-12-28.json', 'utf8'))

console.log('Top-level keys:', Object.keys(json))
console.log('tripName:', json.tripName)
console.log('hotels:', json.hotels?.length, 'restaurants:', json.restaurants?.length, 'activities:', json.activities?.length)

const items = []
;['hotels', 'restaurants', 'activities'].forEach(key => {
  const type = { hotels: 'hotel', restaurants: 'restaurant', activities: 'activity' }[key]
  ;(json[key] || []).forEach(raw => items.push({ raw, type }))
})

console.log(`\nTotal items: ${items.length}`)
console.log('\nFirst hotel normalized:')
const h = items.find(i => i.type === 'hotel')
if (h) {
  const r = h.raw
  console.log({
    type: h.type,
    name: r.name,
    city: r.city,
    date: r.date,
    endDate: r.endDate,
    priority: r.priority,
    isBooked: r.isBooked,
    price: r.price,
    createdAt: r.createdAt
  })
}
console.log('\nFirst restaurant:')
const re = items.find(i => i.type === 'restaurant')
if (re) console.log({ type: re.type, name: re.raw.name, city: re.raw.city, price: re.raw.price })

console.log('\nFirst activity:')
const a = items.find(i => i.type === 'activity')
if (a) console.log({ type: a.type, name: a.raw.name, city: a.raw.city, date: a.raw.date })
