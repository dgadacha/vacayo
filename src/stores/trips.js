import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, getDoc
} from 'firebase/firestore'
import { db, COL } from '@/services/firebase'
import { useAuthStore } from './auth'

let unsubTrips = null

const ROLES = ['owner', 'editor', 'viewer']

export const useTripsStore = defineStore('trips', () => {
  const trips = ref([])
  const loading = ref(false)
  const error = ref('')
  const auth = useAuthStore()

  const sortedTrips = computed(() =>
    [...trips.value].sort((a, b) => {
      const ka = a.updatedAt?.seconds || a.createdAt?.seconds || 0
      const kb = b.updatedAt?.seconds || b.createdAt?.seconds || 0
      return kb - ka
    })
  )

  function subscribe() {
    unsubTrips?.()
    const uid = auth.user?.uid
    if (!uid) { trips.value = []; return }
    loading.value = true
    const q = query(collection(db, COL.trips), where(`members.${uid}`, 'in', ROLES))
    unsubTrips = onSnapshot(
      q,
      (snap) => {
        trips.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        loading.value = false
      },
      (err) => {
        console.error('Trips snapshot error', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  function unsubscribe() {
    unsubTrips?.()
    unsubTrips = null
    trips.value = []
  }

  watch(() => auth.user?.uid, (uid) => {
    if (uid) subscribe()
    else unsubscribe()
  }, { immediate: true })

  function getById(id) { return trips.value.find(t => t.id === id) || null }

  async function fetchTripById(id) {
    const snap = await getDoc(doc(db, COL.trips, id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }

  function roleOf(trip) {
    const uid = auth.user?.uid
    return uid && trip?.members?.[uid] ? trip.members[uid] : null
  }
  function canEdit(trip) {
    const r = roleOf(trip)
    return r === 'owner' || r === 'editor'
  }
  function isOwner(trip) { return roleOf(trip) === 'owner' }

  async function createTrip(data) {
    const uid = auth.user?.uid
    if (!uid) throw new Error('Non connecté')
    const payload = {
      name: (data.name || '').trim() || 'Nouveau voyage',
      destination: (data.destination || '').trim(),
      country: (data.country || '').trim(),
      startDate: data.startDate || '',
      endDate: data.endDate || '',
      currency: data.currency || 'EUR',
      currencySymbol: data.currencySymbol || '€',
      budget: Number(data.budget) || 0,
      coverImage: data.coverImage || '',
      members: { [uid]: 'owner' },
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
    const ref = await addDoc(collection(db, COL.trips), payload)
    return { id: ref.id, ...payload }
  }

  async function updateTrip(id, patch) {
    const clean = { ...patch, updatedAt: serverTimestamp() }
    delete clean.id
    delete clean.createdBy
    delete clean.createdAt
    delete clean.members
    await updateDoc(doc(db, COL.trips, id), clean)
  }

  async function deleteTrip(id) {
    await deleteDoc(doc(db, COL.trips, id))
  }

  return { trips, loading, error, sortedTrips, getById, fetchTripById, roleOf, canEdit, isOwner, createTrip, updateTrip, deleteTrip }
})
