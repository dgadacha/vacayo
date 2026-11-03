import { BedDouble, UtensilsCrossed, Ticket, Hotel, Flag, Star, Circle } from 'lucide-vue-next'

// Colors follow Apple Maps categories: lodging indigo, food orange, sights pink.
export const ACTIVITY_TYPES = {
  hotel: {
    label: 'Hôtel',
    plural: 'Hôtels',
    icon: BedDouble,
    iconBig: Hotel,
    color: '#5856d6',
    badge: 'bg-[#5856d6]/15 text-[#5856d6] dark:bg-[#5e5ce6]/25 dark:text-[#a5a3ff]',
    soft: 'bg-[#5856d6]/15 text-[#5856d6] dark:bg-[#5e5ce6]/25 dark:text-[#a5a3ff]',
    gradient: 'from-[#7d7aff] to-[#5856d6]'
  },
  restaurant: {
    label: 'Restaurant',
    plural: 'Restos',
    icon: UtensilsCrossed,
    iconBig: UtensilsCrossed,
    color: '#ff9500',
    badge: 'bg-[#ff9500]/15 text-[#c93400] dark:bg-[#ff9f0a]/25 dark:text-[#ffb340]',
    soft: 'bg-[#ff9500]/15 text-[#c93400] dark:bg-[#ff9f0a]/25 dark:text-[#ffb340]',
    gradient: 'from-[#ffb340] to-[#ff9500]'
  },
  activity: {
    label: 'Activité',
    plural: 'Activités',
    icon: Ticket,
    iconBig: Ticket,
    color: '#ff2d55',
    badge: 'bg-[#ff2d55]/15 text-[#d30f45] dark:bg-[#ff375f]/25 dark:text-[#ff6482]',
    soft: 'bg-[#ff2d55]/15 text-[#d30f45] dark:bg-[#ff375f]/25 dark:text-[#ff6482]',
    gradient: 'from-[#ff6482] to-[#ff2d55]'
  }
}

export const PRIORITY_OPTIONS = [
  { value: 'must-do', label: 'À ne pas rater', icon: Flag, color: 'bg-[#ff3b30]/15 text-[#d70015] dark:bg-[#ff453a]/25 dark:text-[#ff6961]', dot: 'bg-[#ff3b30]' },
  { value: 'high', label: 'Important', icon: Star, color: 'bg-[#ff9500]/15 text-[#c93400] dark:bg-[#ff9f0a]/25 dark:text-[#ffb340]', dot: 'bg-[#ff9500]' },
  { value: 'normal', label: 'Normal', icon: Circle, color: 'bg-[#8e8e93]/15 text-[#6c6c70] dark:bg-[#8e8e93]/25 dark:text-[#aeaeb2]', dot: 'bg-[#8e8e93]' }
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
