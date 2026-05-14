// Legacy localStorage helpers — kept for reference, no longer used by stores.
// All state now flows through Firestore (services/firebase.js).
import { STORAGE_KEYS } from '@/utils/constants'

class Storage {
  read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : fallback
    } catch { return fallback }
  }
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)) }
  remove(key) { localStorage.removeItem(key) }
  resetAll() { Object.values(STORAGE_KEYS).forEach(k => this.remove(k)) }
}

export const storage = new Storage()
