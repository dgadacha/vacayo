import admin from 'firebase-admin'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const credentials = JSON.parse(readFileSync(resolve(__dirname, '..', '.firebase-admin-key.json'), 'utf8'))
admin.initializeApp({ credential: admin.credential.cert(credentials), projectId: credentials.project_id })
const db = admin.firestore()

const UID = 'NztTUX7cf5cAWdB38eCKozsP6KB2' // etran (created most data)

async function main() {
  console.log(`\n→ Test query: trips where members.${UID} in ['owner','editor','viewer']`)
  const tripsSnap = await db.collection('trips')
    .where(`members.${UID}`, 'in', ['owner', 'editor', 'viewer'])
    .get()
  console.log(`  ${tripsSnap.size} trips:`)
  tripsSnap.docs.forEach(d => console.log(`  - ${d.id} :: ${d.data().name} (role: ${d.data().members[UID]})`))

  if (tripsSnap.size > 0) {
    const firstTrip = tripsSnap.docs[0]
    console.log(`\n→ Test query: activities where tripId == ${firstTrip.id}`)
    const actSnap = await db.collection('activities').where('tripId', '==', firstTrip.id).get()
    console.log(`  ${actSnap.size} activities. Types:`)
    const types = {}
    actSnap.docs.forEach(d => { const t = d.data().type || '?'; types[t] = (types[t] || 0) + 1 })
    Object.entries(types).forEach(([t, c]) => console.log(`  - ${t}: ${c}`))
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
