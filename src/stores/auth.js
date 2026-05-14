import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, COL } from '@/services/firebase'

async function ensureUserDoc(u, extra = {}) {
  if (!u?.uid) return
  const ref = doc(db, COL.users, u.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    if (extra.displayName && !snap.data().displayName) {
      await setDoc(ref, { displayName: extra.displayName }, { merge: true })
    }
    return
  }
  await setDoc(ref, {
    email: u.email || '',
    displayName: extra.displayName || u.displayName || (u.email?.split('@')[0]) || '',
    photoURL: u.photoURL || '',
    createdAt: serverTimestamp()
  })
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)
  const error = ref('')

  onAuthStateChanged(auth, async (u) => {
    if (u) {
      user.value = {
        uid: u.uid,
        email: u.email,
        name: u.displayName || u.email?.split('@')[0] || 'Utilisateur',
        photoURL: u.photoURL
      }
      ensureUserDoc(u).catch(e => console.warn('ensureUserDoc failed', e))
    } else {
      user.value = null
    }
    ready.value = true
  })

  const isAuthenticated = computed(() => !!user.value)

  function friendly(e) {
    const code = e?.code || ''
    const map = {
      'auth/invalid-credential': 'Email ou mot de passe incorrect',
      'auth/invalid-email': 'Email invalide',
      'auth/user-not-found': 'Aucun compte avec cet email',
      'auth/wrong-password': 'Mot de passe incorrect',
      'auth/email-already-in-use': 'Cet email est déjà utilisé',
      'auth/weak-password': 'Mot de passe trop faible (6+ caractères)',
      'auth/network-request-failed': 'Problème de connexion réseau',
      'auth/too-many-requests': 'Trop de tentatives, réessaie plus tard',
      'auth/operation-not-allowed': "Sign-in Email/Password n'est pas activé dans la console Firebase"
    }
    return map[code] || e?.message || 'Une erreur est survenue'
  }

  async function login(email, password) {
    error.value = ''
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      await ensureUserDoc(cred.user)
      return cred.user
    } catch (e) {
      const msg = friendly(e)
      error.value = msg
      throw new Error(msg)
    }
  }

  async function register(email, password, displayName = '') {
    error.value = ''
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const name = displayName?.trim() || email.split('@')[0]
      try { await updateProfile(cred.user, { displayName: name }) } catch {}
      await ensureUserDoc(cred.user, { displayName: name })
      return cred.user
    } catch (e) {
      const msg = friendly(e)
      error.value = msg
      throw new Error(msg)
    }
  }

  async function resetPassword(email) {
    error.value = ''
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (e) {
      const msg = friendly(e)
      error.value = msg
      throw new Error(msg)
    }
  }

  async function logout() { await signOut(auth) }

  return { user, ready, error, isAuthenticated, login, register, resetPassword, logout }
})
