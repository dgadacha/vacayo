import { BedDouble, UtensilsCrossed, Compass, Hotel, MapPin, Flag, Star, Circle } from 'lucide-vue-next'

export const ACTIVITY_TYPES = {
  hotel: {
    label: 'Hôtel',
    plural: 'Hôtels',
    icon: BedDouble,
    iconBig: Hotel,
    color: '#0284c7',
    badge: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30',
    soft: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
    gradient: 'from-sky-500 to-blue-600'
  },
  restaurant: {
    label: 'Restaurant',
    plural: 'Restos',
    icon: UtensilsCrossed,
    iconBig: UtensilsCrossed,
    color: '#d97706',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
    soft: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    gradient: 'from-amber-500 to-orange-600'
  },
  activity: {
    label: 'Activité',
    plural: 'Activités',
    icon: Compass,
    iconBig: MapPin,
    color: '#7c3aed',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
    soft: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
    gradient: 'from-violet-500 to-purple-600'
  }
}

export const PRIORITY_OPTIONS = [
  { value: 'must-do', label: 'À ne pas rater', icon: Flag, color: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30', dot: 'bg-rose-500' },
  { value: 'high', label: 'Important', icon: Star, color: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30', dot: 'bg-amber-500' },
  { value: 'normal', label: 'Normal', icon: Circle, color: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30', dot: 'bg-slate-400' }
]

export const SORT_OPTIONS = [
  { value: 'date_asc', label: 'Date (plus tôt)' },
  { value: 'date_desc', label: 'Date (plus tard)' },
  { value: 'name_asc', label: 'Nom A → Z' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'priority', label: 'Priorité' }
]

export const STORAGE_KEYS = {
  user: 'vacayo:user',
  trips: 'vacayo:trips',
  activities: 'vacayo:activities',
  seeded: 'vacayo:seeded'
}
