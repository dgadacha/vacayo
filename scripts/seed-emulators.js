// Seeds the local Firebase emulators with a demo account and two trips.
// Usage: npm run emulators   (other terminal)   then   npm run seed:emulators
// Demo login: demo@vacayo.test / vacayo-demo — exists only in the emulator.
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'

import admin from 'firebase-admin'

admin.initializeApp({ projectId: 'demo-vacayo' })
const db = admin.firestore()
const auth = admin.auth()

const EMAIL = 'demo@vacayo.test'
const PASSWORD = 'vacayo-demo'

function isoDay(offset, time) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const day = d.toISOString().slice(0, 10)
  return time ? `${day}T${time}` : day
}

async function main() {
  let user
  try { user = await auth.getUserByEmail(EMAIL) }
  catch { user = await auth.createUser({ email: EMAIL, password: PASSWORD, displayName: 'Dylan' }) }
  const uid = user.uid

  await db.collection('users').doc(uid).set({ email: EMAIL, displayName: 'Dylan', tutorialDone: false, createdAt: admin.firestore.FieldValue.serverTimestamp() })

  const old = await db.collection('trips').where(`members.${uid}`, '==', 'owner').get()
  for (const t of old.docs) {
    const acts = await db.collection('activities').where('tripId', '==', t.id).get()
    await Promise.all(acts.docs.map(a => a.ref.delete()))
    await t.ref.delete()
  }

  const start = 12
  const japan = await db.collection('trips').add({
    name: 'Japon 2026', destination: 'Tokyo', country: 'Japon',
    startDate: isoDay(start), endDate: isoDay(start + 9),
    currency: 'JPY', currencySymbol: '¥', budget: 650000,
    coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=70',
    members: { [uid]: 'owner' }, createdBy: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  const items = [
    { type: 'hotel', name: 'Hotel Gracery Shinjuku', city: 'Tokyo - Shinjuku', category: 'Hôtel 4★', price: 98000, date: isoDay(start, '15:00'), endDate: isoDay(start + 4, '11:00'), isBooked: true, priority: 'high', notes: 'Réservation #GX-48213\nVue Godzilla demandée.' },
    { type: 'hotel', name: 'Ryokan Yachiyo', city: 'Kyoto', category: 'Ryokan', price: 142000, date: isoDay(start + 4, '16:00'), endDate: isoDay(start + 7, '10:00'), isBooked: false, priority: 'must-do' },
    { type: 'hotel', name: 'Cross Hotel Osaka', city: 'Osaka', category: 'Hôtel', price: 54000, date: isoDay(start + 7, '15:00'), endDate: isoDay(start + 9, '11:00'), isBooked: true },
    { type: 'restaurant', name: 'Ichiran Shibuya', city: 'Tokyo - Shibuya', category: 'Ramen', price: 2400, date: isoDay(start, '20:00'), priority: 'normal' },
    { type: 'restaurant', name: 'Sushi Dai', city: 'Tokyo - Toyosu', category: 'Sushi', price: 9000, date: isoDay(start + 1, '07:00'), priority: 'must-do', notes: 'Arriver à 5h pour la file.' },
    { type: 'restaurant', name: 'Nishiki Market', city: 'Kyoto', category: 'Street food', price: 3000, date: '', priority: 'high' },
    { type: 'restaurant', name: 'Kani Doraku', city: 'Osaka', category: 'Crabe', price: 12000, date: '' },
    { type: 'activity', name: 'teamLab Planets', city: 'Tokyo - Toyosu', category: 'Musée immersif', price: 7600, date: isoDay(start + 1, '10:30'), isBooked: true, priority: 'must-do' },
    { type: 'activity', name: 'Shibuya Sky', city: 'Tokyo - Shibuya', category: 'Point de vue', price: 4400, date: isoDay(start + 2, '17:30'), priority: 'high' },
    { type: 'activity', name: 'Fushimi Inari', city: 'Kyoto', category: 'Sanctuaire', price: 0, date: isoDay(start + 5, '07:30'), priority: 'must-do' },
    { type: 'activity', name: 'Arashiyama Bamboo Grove', city: 'Kyoto', category: 'Nature', price: 0, date: '' },
    { type: 'activity', name: 'Kinkaku-ji', city: 'Kyoto', category: 'Temple', price: 1000, date: '', priority: 'high' },
    { type: 'activity', name: 'Dotonbori by night', city: 'Osaka', category: 'Balade', price: 0, date: '' },
    { type: 'activity', name: 'Universal Studios Japan', city: 'Osaka', category: 'Parc', price: 17800, date: '' },
    { type: 'activity', name: 'Akihabara', city: 'Tokyo - Akihabara', category: 'Shopping', price: 0, date: '', isDone: false }
  ]
  const batch = db.batch()
  items.forEach(i => {
    batch.set(db.collection('activities').doc(), {
      tripId: japan.id, notes: '', photoUrl: '', bookingUrl: '', googleMapsUrl: '',
      priority: 'normal', isDone: false, isBooked: false, endDate: '', createdBy: uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), ...i
    })
  })
  await batch.commit()

  await db.collection('trips').add({
    name: 'Nouméa', destination: 'Nouméa', country: 'Nouvelle-Calédonie',
    startDate: isoDay(-120), endDate: isoDay(-110),
    currency: 'XPF', currencySymbol: '₣', budget: 0, coverImage: '',
    members: { [uid]: 'owner' }, createdBy: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })

  console.log(`Seeded ${items.length} items for ${EMAIL}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
