import { initializeApp } from 'firebase/app'
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyD0Y8R7qsmZ28R-RL-9AdW9s3so2GCGbSc',
  authDomain: 'vacayo-77ad3.firebaseapp.com',
  projectId: 'vacayo-77ad3',
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

export const COL = {
  trips: 'trips',
  activities: 'activities',
  users: 'users',
  invitations: 'invitations'
}
