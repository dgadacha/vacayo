import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from 'firebase/firestore'
import { db, COL } from '@/services/firebase'
import { useAuthStore } from './auth'
import { parseDate, expandHotelDates, formatDayKey } from '@/utils/helpers'

const PRIORITY_RANK = { 'must-do': 0, high: 1, normal: 2 }

let unsubItems = null

function emptyFilters() {
  return { search: '', city: '', sort: 'date_asc' }
}
function emptyFiltersByType() {
  return { hotel: emptyFilters(), restaurant: emptyFilters(), activity: emptyFilters() }
}

export const useActivitiesStore = defineStore('activities', () => {
  const all = ref([])
  const currentTripId = ref(null)
  const loading = ref(false)
  const error = ref('')
  const filtersByType = ref(emptyFiltersByType())

  function teardown() {
    if (unsubItems) { try { unsubItems() } catch {} }
    unsubItems = null
    all.value = []
    currentTripId.value = null
    loading.value = false
  }

  function setTrip(tripId) {
    teardown()
    if (!tripId) return
    currentTripId.value = tripId
    filtersByType.value = emptyFiltersByType()
    loading.value = true
    const q = query(collection(db, COL.activities), where('tripId', '==', tripId))
    unsubItems = onSnapshot(
      q,
      (snap) => {
        all.value = snap.docs.map(d => {
          const data = d.data()
          return { id: d.id, type: data.type || 'activity', ...data }
        })
        loading.value = false
      },
      (err) => {
        console.error('Activities snapshot error', err)
        error.value = err.message
        loading.value = false
      }
    )
  }

  function filtersFor(type) {
    if (!filtersByType.value[type]) filtersByType.value[type] = emptyFilters()
    return filtersByType.value[type]
  }
  function resetFilters(type) {
    if (type) filtersByType.value[type] = emptyFilters()
    else filtersByType.value = emptyFiltersByType()
  }

  const tripActivities = computed(() => all.value)

  function citiesFor(type) {
    const set = new Set()
    all.value.forEach(a => {
      if (a.type === type && a.city) set.add(a.city)
    })
    return [...set].sort()
  }

  function sortFn(filters) {
    return (a, b) => {
      switch (filters.sort) {
        case 'date_desc': return (b.date || '').localeCompare(a.date || '')
        case 'name_asc': return (a.name || '').localeCompare(b.name || '')
        case 'price_asc': return (a.price || 0) - (b.price || 0)
        case 'price_desc': return (b.price || 0) - (a.price || 0)
        case 'priority': return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
        default: return (a.date || '￿').localeCompare(b.date || '￿')
      }
    }
  }

  function applyFilters(list, filters) {
    const q = filters.search.trim().toLowerCase()
    return list
      .filter(a => !filters.city || a.city === filters.city)
      .filter(a => {
        if (!q) return true
        return [a.name, a.city, a.category, a.notes].some(v => (v || '').toLowerCase().includes(q))
      })
      .sort(sortFn(filters))
  }

  const filteredHotels = computed(() => applyFilters(all.value.filter(a => a.type === 'hotel'), filtersByType.value.hotel))
  const filteredRestaurants = computed(() => applyFilters(all.value.filter(a => a.type === 'restaurant'), filtersByType.value.restaurant))
  const filteredActivities = computed(() => applyFilters(all.value.filter(a => a.type === 'activity'), filtersByType.value.activity))

  function isScheduled(a) {
    if (a.type === 'hotel') return true
    return !!(a.date && a.date !== '')
  }

  const stats = computed(() => {
    const list = all.value
    const scheduled = list.filter(isScheduled)
    return {
      total: list.length,
      done: list.filter(a => a.isDone).length,
      booked: list.filter(a => a.isBooked).length,
      scheduledCount: scheduled.length,
      totalPrice: scheduled.reduce((s, a) => s + (Number(a.price) || 0), 0),
      wishlistPrice: list.filter(a => !isScheduled(a)).reduce((s, a) => s + (Number(a.price) || 0), 0),
      hotels: list.filter(a => a.type === 'hotel').length,
      restaurants: list.filter(a => a.type === 'restaurant').length,
      activities: list.filter(a => a.type === 'activity').length
    }
  })

  const calendarDays = computed(() => {
    const map = new Map()
    const add = (key, item) => {
      if (!key) return
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(item)
    }
    all.value.forEach(a => {
      if (a.type === 'hotel') {
        expandHotelDates(a).forEach(d => add(formatDayKey(d), a))
      } else if (a.date) {
        add(formatDayKey(a.date), a)
      }
    })
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({
        key,
        date: parseDate(key),
        items: items.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      }))
  })

  async function addActivity(data) {
    const auth = useAuthStore()
    const tripId = currentTripId.value
    if (!tripId) throw new Error('Aucun voyage sélectionné')
    const payload = {
      tripId,
      type: data.type || 'activity',
      name: (data.name || '').trim() || 'Sans nom',
      city: data.city || '',
      category: data.category || '',
      price: Number(data.price) || 0,
      date: data.date || '',
      endDate: data.endDate || '',
      notes: data.notes || '',
      photoUrl: data.photoUrl || '',
      bookingUrl: data.bookingUrl || '',
      googleMapsUrl: data.googleMapsUrl || '',
      priority: data.priority || 'normal',
      isDone: false,
      isBooked: !!data.isBooked,
      createdBy: auth.user?.uid || '',
      createdAt: serverTimestamp()
    }
    await addDoc(collection(db, COL.activities), payload)
  }

  async function updateActivity(id, patch) {
    const clean = { ...patch }
    delete clean.id
    delete clean.createdBy
    delete clean.createdAt
    await updateDoc(doc(db, COL.activities, id), clean)
  }

  async function deleteActivity(id) {
    await deleteDoc(doc(db, COL.activities, id))
  }

  async function toggleDone(id) {
    const a = all.value.find(x => x.id === id)
    if (a) await updateActivity(id, { isDone: !a.isDone })
  }

  async function toggleBooked(id) {
    const a = all.value.find(x => x.id === id)
    if (a) await updateActivity(id, { isBooked: !a.isBooked })
  }

  return {
    all, currentTripId, filtersByType, loading, error,
    setTrip, teardown,
    tripActivities, citiesFor, filtersFor, resetFilters,
    filteredHotels, filteredRestaurants, filteredActivities,
    stats, calendarDays,
    addActivity, updateActivity, deleteActivity, toggleDone, toggleBooked
  }
})
