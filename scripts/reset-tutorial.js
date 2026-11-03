// Sets users/{uid}.tutorialDone = false for every user, so everyone sees the
// first-use tutorial again at their next visit.
//
// Production: needs a service account key saved as .firebase-admin-key.json at the
// repo root (Firebase console → Project settings → Service accounts → Generate
// new private key). Never commit it (it is in .gitignore).
//   npm run reset:tutorial
// Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run reset:tutorial
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keyPath = resolve(__dirname, '..', '.firebase-admin-key.json')

if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({ projectId: 'demo-vacayo' })
} else {
  if (!existsSync(keyPath)) {
    console.error(`Missing ${keyPath} (see the comment at the top of this script).`)
    process.exit(1)
  }
  const credentials = JSON.parse(readFileSync(keyPath, 'utf8'))
  admin.initializeApp({ credential: admin.credential.cert(credentials), projectId: credentials.project_id })
}

const db = admin.firestore()
const snap = await db.collection('users').get()
let batch = db.batch()
let pending = 0
for (const d of snap.docs) {
  batch.update(d.ref, { tutorialDone: false })
  if (++pending === 400) { await batch.commit(); batch = db.batch(); pending = 0 }
}
if (pending) await batch.commit()
console.log(`tutorialDone = false for ${snap.size} user(s)`)
process.exit(0)
