import { initializeApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence, connectAuthEmulator } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore'

// `npm run emulators` + `npm run dev:emulators`: local Auth/Firestore, nothing touches prod.
const useEmulators = import.meta.env.VITE_FIREBASE_EMULATORS === 'true'

const firebaseConfig = {
  apiKey: 'AIzaSyD0Y8R7qsmZ28R-RL-9AdW9s3so2GCGbSc',
  authDomain: 'vacayo-77ad3.firebaseapp.com',
  projectId: useEmulators ? 'demo-vacayo' : 'vacayo-77ad3',
  storageBucket: 'vacayo-77ad3.firebasestorage.app',
  messagingSenderId: '266213572596',
  appId: '1:266213572596:web:4aa45d14fb1eb94c4fc3a1',
  measurementId: 'G-FLS0SNPCLQ'
}

export const app = initializeApp(firebaseConfig)

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
})

export const auth = getAuth(app)
setPersistence(auth, browserLocalPersistence).catch(() => {})

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const COL = {
  trips: 'trips',
  activities: 'activities',
  users: 'users',
  invitations: 'invitations'
}
