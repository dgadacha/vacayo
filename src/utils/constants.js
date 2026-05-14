import { BedDouble, UtensilsCrossed, Compass, Hotel, MapPin, Flag, Star, Circle } from 'lucide-vue-next'

export const ACTIVITY_TYPES = {
  hotel: {
    label: 'Hôtel',
    icon: BedDouble,
    iconBig: Hotel,
    badge: 'bg-sky-50 text-sky-700 ring-sky-200',
    gradient: 'from-sky-500 to-blue-600'
  },
  restaurant: {
    label: 'Restaurant',
    icon: UtensilsCrossed,
    iconBig: UtensilsCrossed,
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    gradient: 'from-amber-500 to-orange-600'
  },
  activity: {
    label: 'Activité',
    icon: Compass,
    iconBig: MapPin,
    badge: 'bg-violet-50 text-violet-700 ring-violet-200',
    gradient: 'from-violet-500 to-purple-600'
  }
}

export const PRIORITY_OPTIONS = [
  { value: 'must-do', label: 'À ne pas rater', icon: Flag, color: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  { value: 'high', label: 'Important', icon: Star, color: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  { value: 'normal', label: 'Normal', icon: Circle, color: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' }
]

export const SORT_OPTIONS = [
  { value: 'date_asc', label: 'Date ↑' },
  { value: 'date_desc', label: 'Date ↓' },
  { value: 'name_asc', label: 'Nom A-Z' },
  { value: 'price_asc', label: 'Prix ↑' },
  { value: 'price_desc', label: 'Prix ↓' },
  { value: 'priority', label: 'Priorité' }
]

export const STORAGE_KEYS = {
  user: 'vacayo:user',
  trips: 'vacayo:trips',
  activities: 'vacayo:activities',
  seeded: 'vacayo:seeded'
}
