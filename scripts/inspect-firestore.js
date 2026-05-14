import admin from 'firebase-admin'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const keyPath = resolve(__dirname, '..', '.firebase-admin-key.json')
const credentials = JSON.parse(readFileSync(keyPath, 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(credentials),
  projectId: credentials.project_id
})
const db = admin.firestore()

function preview(value, depth = 0) {
  if (value === null || value === undefined) return String(value)
  if (value instanceof admin.firestore.Timestamp) return `<Timestamp ${value.toDate().toISOString()}>`
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[${value.length}] e.g. ${preview(value[0], depth + 1)}`
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) return '{}'
    if (depth > 1) return `{${keys.join(', ')}}`
    const parts = keys.slice(0, 5).map(k => `${k}: ${preview(value[k], depth + 1)}`)
    return `{ ${parts.join(', ')}${keys.length > 5 ? ', …' : ''} }`
  }
  if (typeof value === 'string') return value.length > 80 ? JSON.stringify(value.slice(0, 80) + '…') : JSON.stringify(value)
  return JSON.stringify(value)
}

function schemaOf(docs) {
  const fields = new Map()
  docs.forEach(doc => {
    const d = doc.data()
    Object.entries(d).forEach(([k, v]) => {
      let type
      if (v === null) type = 'null'
      else if (v instanceof admin.firestore.Timestamp) type = 'Timestamp'
      else if (Array.isArray(v)) type = 'array'
      else type = typeof v
      const key = k
      if (!fields.has(key)) fields.set(key, { types: new Set(), present: 0, sample: v })
      fields.get(key).types.add(type)
      fields.get(key).present += 1
    })
  })
  return fields
}

async function inspect(name, limit = 3) {
  const col = db.collection(name)
  const snap = await col.limit(50).get()
  console.log(`\n━━━━━━━ ${name} ━━━━━━━`)
  console.log(`docs (capped): ${snap.size}`)
  if (snap.size === 0) return
  // get total count
  try {
    const count = await col.count().get()
    console.log(`total count: ${count.data().count}`)
  } catch {}
  // schema
  const fields = schemaOf(snap.docs)
  console.log('\nfields:')
  ;[...fields.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([k, info]) => {
    const presence = `${info.present}/${snap.size}`
    const types = [...info.types].join('|')
    console.log(`  ${k.padEnd(22)} ${types.padEnd(20)} (${presence})  e.g. ${preview(info.sample)}`)
  })
  // sample docs
  console.log(`\nsample docs (first ${limit}):`)
  snap.docs.slice(0, limit).forEach(d => {
    console.log(`  ${d.id}:`)
    Object.entries(d.data()).forEach(([k, v]) => {
      console.log(`    ${k}: ${preview(v)}`)
    })
  })
}

async function main() {
  const collections = ['trips', 'activities', 'users', 'invitations']
  for (const name of collections) {
    try { await inspect(name) }
    catch (e) { console.log(`\n${name}: ERROR ${e.message}`) }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
