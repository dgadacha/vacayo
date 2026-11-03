import {
  format, parseISO, isValid, eachDayOfInterval, isSameDay,
  startOfDay, addDays, subDays, differenceInCalendarDays,
  startOfMonth, isSameMonth, addMonths, subMonths
} from 'date-fns'
import { fr } from 'date-fns/locale'

export function uid() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) return isValid(value) ? value : null
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000)
  }
  const d = parseISO(value)
  return isValid(d) ? d : null
}

export function formatDate(value, pattern = 'd MMM yyyy') {
  const d = parseDate(value)
  return d ? format(d, pattern, { locale: fr }) : ''
}

export function formatTime(value) {
  const d = parseDate(value)
  return d ? format(d, 'HH:mm') : ''
}

export function formatDayKey(value) {
  const d = parseDate(value)
  return d ? format(startOfDay(d), 'yyyy-MM-dd') : ''
}

export function formatPrice(value, symbol = '€') {
  if (value === undefined || value === null || value === '') return 'Gratuit'
  const n = Number(value)
  if (!n) return 'Gratuit'
  return `${new Intl.NumberFormat('fr-FR').format(n)} ${symbol}`
}

// Short amount for tight spots: 142 000 → "142k"
export function formatCompact(value, symbol = '€') {
  const n = Number(value) || 0
  const s = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  return `${s} ${symbol}`
}

// Where a trip stands relative to today, for countdowns and grouping.
export function tripStatus(trip, now = new Date()) {
  const start = parseDate(trip?.startDate)
  const end = parseDate(trip?.endDate) || start
  if (!start) return { state: 'undated', label: 'Dates à définir' }
  const today = startOfDay(now)
  const total = differenceInCalendarDays(end, start) + 1
  const until = differenceInCalendarDays(start, today)
  if (until > 0) {
    const label = until === 1 ? 'Demain' : until < 45 ? `Dans ${until} jours` : `Dans ${Math.round(until / 30)} mois`
    return { state: 'upcoming', label, daysUntil: until, totalDays: total }
  }
  const sinceEnd = differenceInCalendarDays(today, end)
  if (sinceEnd > 0) return { state: 'past', label: 'Terminé', totalDays: total }
  const day = differenceInCalendarDays(today, start) + 1
  return { state: 'ongoing', label: `Jour ${day} / ${total}`, day, totalDays: total }
}

export function nightsBetween(a, b) {
  const s = parseDate(a)
  const e = parseDate(b)
  if (!s || !e) return 0
  return Math.max(0, differenceInCalendarDays(startOfDay(e), startOfDay(s)))
}

export function expandHotelDates(hotel) {
  const start = parseDate(hotel.date)
  const end = parseDate(hotel.endDate)
  if (!start || !end) return []
  return eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) })
}

export function colorFromString(str = '') {
  const palette = [
    'from-rose-400 to-pink-500', 'from-pink-400 to-fuchsia-500', 'from-fuchsia-400 to-purple-500',
    'from-purple-400 to-violet-500', 'from-violet-400 to-indigo-500', 'from-indigo-400 to-blue-500',
    'from-blue-400 to-sky-500', 'from-sky-400 to-cyan-500', 'from-cyan-400 to-teal-500',
    'from-teal-400 to-emerald-500', 'from-emerald-400 to-green-500', 'from-green-400 to-lime-500',
    'from-lime-400 to-yellow-500', 'from-yellow-400 to-amber-500', 'from-amber-400 to-orange-500',
    'from-orange-400 to-red-500'
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0x7fffffff
  return palette[hash % palette.length]
}

export function sameDay(a, b) {
  const da = parseDate(a)
  const db = parseDate(b)
  return da && db && isSameDay(da, db)
}

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'JPY', symbol: '¥', label: 'Yen japonais' },
  { code: 'USD', symbol: '$', label: 'Dollar US' },
  { code: 'KRW', symbol: '₩', label: 'Won coréen' },
  { code: 'GBP', symbol: '£', label: 'Livre sterling' },
  { code: 'AUD', symbol: 'A$', label: 'Dollar australien' },
  { code: 'CAD', symbol: 'C$', label: 'Dollar canadien' },
  { code: 'CHF', symbol: 'CHF', label: 'Franc suisse' },
  { code: 'CNY', symbol: '¥', label: 'Yuan chinois' },
  { code: 'THB', symbol: '฿', label: 'Baht thaï' },
  { code: 'XPF', symbol: '₣', label: 'Franc Pacifique' }
]

export { addDays, subDays, differenceInCalendarDays, isSameDay, startOfDay, startOfMonth, isSameMonth, addMonths, subMonths }
