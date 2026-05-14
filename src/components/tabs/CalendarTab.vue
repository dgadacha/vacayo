<script setup>
import { ref, computed, watch, onMounted, nextTick, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { useTripsStore } from '@/stores/trips'
import { useRoute } from 'vue-router'
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays,
  BedDouble, UtensilsCrossed, Compass, LogIn, LogOut, Moon, Clock,
  MapPin, ExternalLink, Pencil, Sunrise, Sun, Sunset, BadgeCheck
} from 'lucide-vue-next'
import {
  parseDate, formatDate, formatTime, formatDayKey, expandHotelDates,
  addDays, subDays, differenceInCalendarDays, isSameDay, startOfDay,
  startOfMonth, isSameMonth, addMonths
} from '@/utils/helpers'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'

const props = defineProps({ onEdit: Function })

const activities = useActivitiesStore()
const trips = useTripsStore()
const route = useRoute()
const injectedTrip = inject('trip', null)
const trip = computed(() => injectedTrip?.value || trips.getById(route.params.id))
const canEdit = inject('canEdit', ref(true))
const symbol = computed(() => trip.value?.currencySymbol || '€')

const todayKey = formatDayKey(new Date())
const selectedDate = ref(null)

// Build full days list from trip range OR from activity range
const allDays = computed(() => {
  const t = trip.value
  let start, end
  if (t?.startDate && t?.endDate) {
    start = startOfDay(parseDate(t.startDate))
    end = startOfDay(parseDate(t.endDate))
  } else {
    const keys = activities.calendarDays.map(d => d.key).sort()
    if (!keys.length) return []
    start = startOfDay(parseDate(keys[0]))
    end = startOfDay(parseDate(keys[keys.length - 1]))
  }
  if (!start || !end) return []
  const days = []
  let cur = start
  while (cur <= end) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
})

const selectedIdx = computed(() => {
  if (!selectedDate.value || !allDays.value.length) return 0
  const idx = allDays.value.findIndex(d => isSameDay(d, selectedDate.value))
  return idx === -1 ? 0 : idx
})

const dayCount = computed(() => allDays.value.length)

// Months covered by the trip
const monthsInTrip = computed(() => {
  if (!allDays.value.length) return []
  const months = []
  let cur = startOfMonth(allDays.value[0])
  const last = startOfMonth(allDays.value[allDays.value.length - 1])
  while (cur <= last) {
    months.push(cur)
    cur = addMonths(cur, 1)
  }
  return months
})

const currentMonth = computed(() =>
  selectedDate.value ? startOfMonth(selectedDate.value) : null
)
const currentMonthIdx = computed(() =>
  currentMonth.value
    ? monthsInTrip.value.findIndex(m => isSameMonth(m, currentMonth.value))
    : -1
)
const canPrevMonth = computed(() => currentMonthIdx.value > 0)
const canNextMonth = computed(() =>
  currentMonthIdx.value >= 0 && currentMonthIdx.value < monthsInTrip.value.length - 1
)
const daysInCurrentMonth = computed(() => {
  if (!currentMonth.value) return []
  return allDays.value.filter(d => isSameMonth(d, currentMonth.value))
})

function goMonth(delta) {
  const idx = currentMonthIdx.value + delta
  if (idx < 0 || idx >= monthsInTrip.value.length) return
  const targetMonth = monthsInTrip.value[idx]
  const today = startOfDay(new Date())
  const todayInMonth = isSameMonth(today, targetMonth)
    ? allDays.value.find(d => isSameDay(d, today)) : null
  const firstDayInMonth = allDays.value.find(d => isSameMonth(d, targetMonth))
  selectedDate.value = todayInMonth || firstDayInMonth
  nextTick(() => scrollSelectedIntoView())
}

// Find a sensible default: today if in range, else first day with activities, else first day
function initSelectedDate() {
  if (!allDays.value.length) return
  const today = startOfDay(new Date())
  const inRange = allDays.value.find(d => isSameDay(d, today))
  if (inRange) { selectedDate.value = inRange; return }
  const firstWithActivity = activities.calendarDays[0]?.key
  if (firstWithActivity) {
    selectedDate.value = parseDate(firstWithActivity)
    return
  }
  selectedDate.value = allDays.value[0]
}

onMounted(() => {
  initSelectedDate()
  nextTick(() => scrollSelectedIntoView('instant'))
})
watch(() => trip.value?.id, () => initSelectedDate())
watch(() => activities.tripActivities.length, () => { if (!selectedDate.value) initSelectedDate() })

function go(delta) {
  const idx = selectedIdx.value + delta
  if (idx < 0 || idx >= dayCount.value) return
  selectedDate.value = allDays.value[idx]
  nextTick(() => scrollSelectedIntoView())
}
function pick(d) { selectedDate.value = d }

const stripRef = ref(null)
function scrollSelectedIntoView(behavior = 'smooth') {
  const el = stripRef.value?.querySelector('[data-selected="true"]')
  if (el && el.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior })
}
watch(selectedDate, () => nextTick(() => scrollSelectedIntoView()))

// Items for selected day, tagged with role for hotels
const dayItems = computed(() => {
  if (!selectedDate.value) return []
  const key = formatDayKey(selectedDate.value)
  const list = []
  activities.tripActivities.forEach(a => {
    if (a.type === 'hotel') {
      const dates = expandHotelDates(a)
      const inStay = dates.some(d => formatDayKey(d) === key)
      if (!inStay) return
      const isCheckIn = a.date && formatDayKey(a.date) === key
      const isCheckOut = a.endDate && formatDayKey(a.endDate) === key
      let role = 'night'
      let displayTime = ''
      if (isCheckIn) { role = 'checkin'; displayTime = formatTime(a.date) || '15:00' }
      else if (isCheckOut) { role = 'checkout'; displayTime = formatTime(a.endDate) || '11:00' }
      else { role = 'night'; displayTime = '' }
      list.push({ ...a, role, displayTime })
    } else if (a.date && formatDayKey(a.date) === key) {
      list.push({ ...a, role: 'event', displayTime: formatTime(a.date) })
    }
  })
  return list.sort((a, b) => {
    const order = { checkout: 0, event: 1, night: 2, checkin: 3 }
    const t = (a.displayTime || '99:99').localeCompare(b.displayTime || '99:99')
    if (t !== 0) return t
    return order[a.role] - order[b.role]
  })
})

const isToday = computed(() => selectedDate.value && isSameDay(selectedDate.value, new Date()))
const dayOffset = computed(() => {
  if (!selectedDate.value || !allDays.value.length) return null
  const d = differenceInCalendarDays(selectedDate.value, allDays.value[0])
  return d
})

const stats = computed(() => {
  const items = dayItems.value
  return {
    events: items.filter(i => i.role === 'event').length,
    hotel: items.find(i => i.role !== 'event'),
    price: items.filter(i => i.role !== 'night').reduce((s, i) => s + (Number(i.price) || 0), 0)
  }
})

function periodOfDay(time) {
  if (!time) return 'all-day'
  const [h] = time.split(':').map(Number)
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
const grouped = computed(() => {
  const groups = { morning: [], afternoon: [], evening: [], 'all-day': [] }
  dayItems.value.forEach(i => groups[periodOfDay(i.displayTime)].push(i))
  return groups
})
const PERIODS = [
  { key: 'morning', label: 'Matin', icon: Sunrise, range: '06h — 12h' },
  { key: 'afternoon', label: 'Après-midi', icon: Sun, range: '12h — 18h' },
  { key: 'evening', label: 'Soir', icon: Sunset, range: '18h — 24h' },
  { key: 'all-day', label: 'Sans horaire', icon: Clock, range: 'Toute la journée' }
]

const ROLE_META = {
  checkin: { label: 'Arrivée', icon: LogIn, color: 'text-sky-700', bg: 'bg-sky-50 ring-sky-200' },
  checkout: { label: 'Départ', icon: LogOut, color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  night: { label: 'Nuitée', icon: Moon, color: 'text-violet-700', bg: 'bg-violet-50 ring-violet-200' },
  event: { label: '', icon: null, color: '', bg: '' }
}

function typeMeta(t) { return ACTIVITY_TYPES[t] || ACTIVITY_TYPES.activity }
function priorityMeta(p) { return PRIORITY_OPTIONS.find(o => o.value === p) || PRIORITY_OPTIONS[2] }
function openMaps(a) { a.googleMapsUrl && window.open(a.googleMapsUrl, '_blank', 'noopener') }
function openBooking(a) { a.bookingUrl && window.open(a.bookingUrl, '_blank', 'noopener') }
function toggleDone(a) { activities.toggleDone(a.id) }

function dayHasItems(d) {
  const key = formatDayKey(d)
  return activities.calendarDays.find(c => c.key === key)?.items.length || 0
}
</script>

<template>
  <div class="pb-4">
    <!-- Sticky planning header -->
    <div class="sticky top-0 z-10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/70">
      <!-- Row 1 : Month navigation -->
      <div class="px-3 pt-2.5 pb-1.5 flex items-center gap-2">
        <button
          @click="goMonth(-1)"
          :disabled="!canPrevMonth"
          class="btn-icon disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mois précédent"
        >
          <ChevronsLeft class="w-5 h-5" :stroke-width="2" />
        </button>
        <div class="flex-1 text-center min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <template v-if="currentMonthIdx >= 0">
              Mois {{ currentMonthIdx + 1 }} / {{ monthsInTrip.length }}
            </template>
          </p>
          <h2 class="text-[15px] font-bold tracking-tight capitalize">
            {{ formatDate(currentMonth, 'MMMM yyyy') }}
          </h2>
        </div>
        <button
          @click="goMonth(1)"
          :disabled="!canNextMonth"
          class="btn-icon disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Mois suivant"
        >
          <ChevronsRight class="w-5 h-5" :stroke-width="2" />
        </button>
      </div>

      <!-- Row 2 : Day strip (current month) -->
      <div v-if="daysInCurrentMonth.length > 0" ref="stripRef" class="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide snap-x">
        <button
          v-for="d in daysInCurrentMonth"
          :key="formatDayKey(d)"
          :data-selected="isSameDay(d, selectedDate)"
          @click="pick(d)"
          class="flex-shrink-0 snap-center w-12 rounded-xl py-2 px-1 flex flex-col items-center transition relative"
          :class="isSameDay(d, selectedDate) ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-slate-300 dark:hover:ring-slate-600 text-slate-700 dark:text-slate-200'"
        >
          <span class="text-[10px] font-semibold uppercase tracking-wider opacity-80">{{ formatDate(d, 'EEE') }}</span>
          <span class="text-lg font-bold leading-tight mt-0.5">{{ formatDate(d, 'd') }}</span>
          <span v-if="dayHasItems(d) > 0" class="mt-1 w-1 h-1 rounded-full" :class="isSameDay(d, selectedDate) ? 'bg-white' : 'bg-brand-500'" />
          <span v-if="isSameDay(d, new Date()) && !isSameDay(d, selectedDate)" class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-500 ring-2 ring-slate-50" />
        </button>
      </div>

      <!-- Row 3 : Selected day + day prev/next -->
      <div class="px-2 pb-2.5 flex items-center gap-1">
        <button
          @click="go(-1)"
          :disabled="selectedIdx === 0"
          class="btn-icon !w-8 !h-8 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Jour précédent"
        >
          <ChevronLeft class="w-4 h-4" :stroke-width="2" />
        </button>
        <div class="flex-1 text-center min-w-0">
          <h3 class="text-sm font-semibold tracking-tight capitalize truncate">
            {{ formatDate(selectedDate, 'EEEE d MMMM') }}
          </h3>
          <div class="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-0.5">
            <span v-if="isToday" class="text-brand-600 font-semibold">Aujourd'hui</span>
            <span v-else-if="dayOffset !== null && dayCount > 0">J{{ dayOffset >= 0 ? '+' + (dayOffset + 1) : dayOffset }} / {{ dayCount }}</span>
            <template v-if="dayItems.length > 0">
              <span class="text-slate-300">·</span>
              <span class="flex items-center gap-1"><CalendarDays class="w-3 h-3" :stroke-width="2" />{{ dayItems.length }} item{{ dayItems.length > 1 ? 's' : '' }}</span>
            </template>
            <template v-if="stats.hotel">
              <span class="text-slate-300">·</span>
              <span class="flex items-center gap-1 min-w-0 truncate"><BedDouble class="w-3 h-3 flex-shrink-0" :stroke-width="2" /><span class="truncate">{{ stats.hotel.name }}</span></span>
            </template>
          </div>
        </div>
        <button
          @click="go(1)"
          :disabled="selectedIdx >= dayCount - 1"
          class="btn-icon !w-8 !h-8 disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Jour suivant"
        >
          <ChevronRight class="w-4 h-4" :stroke-width="2" />
        </button>
      </div>
    </div>

    <!-- Empty day -->
    <div v-if="dayItems.length === 0" class="text-center py-20 px-6">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <CalendarDays class="w-7 h-7" :stroke-width="1.5" />
      </div>
      <h3 class="font-semibold text-base text-slate-800">Journée libre</h3>
      <p class="text-slate-500 text-sm mt-1">Aucune activité prévue ce jour.</p>
      <button v-if="canEdit" @click="props.onEdit && props.onEdit({ date: selectedDate ? formatDayKey(selectedDate) + 'T10:00' : '' })" class="btn-secondary mt-4 text-xs">
        Ajouter quelque chose
      </button>
    </div>

    <!-- Timeline by period -->
    <div v-else class="px-4 pt-4 space-y-5">
      <template v-for="p in PERIODS" :key="p.key">
        <section v-if="grouped[p.key].length > 0">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <component :is="p.icon" class="w-4 h-4" :stroke-width="2" />
            </div>
            <h3 class="font-semibold text-sm text-slate-700">{{ p.label }}</h3>
            <span class="text-[10px] text-slate-400 ml-auto">{{ p.range }}</span>
          </div>

          <div class="relative pl-12">
            <!-- vertical line -->
            <div class="absolute left-[1.125rem] top-2 bottom-2 w-px bg-slate-200" />

            <div v-for="(item, i) in grouped[p.key]" :key="item.id + i" class="relative pb-3 last:pb-0">
              <!-- Time bubble -->
              <div class="absolute left-[-2.625rem] top-1 flex flex-col items-center w-9">
                <div class="w-9 h-9 rounded-full bg-white ring-2 flex items-center justify-center text-[11px] font-bold"
                  :class="item.role === 'event' ? 'ring-slate-200 text-slate-700' : ROLE_META[item.role].bg + ' ' + ROLE_META[item.role].color">
                  <template v-if="item.displayTime">{{ item.displayTime }}</template>
                  <component v-else :is="ROLE_META[item.role]?.icon || Clock" class="w-4 h-4" :stroke-width="2" />
                </div>
              </div>

              <!-- Card -->
              <article class="card overflow-hidden" :class="{ 'opacity-60': item.isDone }">
                <div class="flex">
                  <div v-if="item.role !== 'event'" class="w-1.5 flex-shrink-0" :class="{
                    'bg-sky-500': item.role === 'checkin',
                    'bg-amber-500': item.role === 'checkout',
                    'bg-violet-500': item.role === 'night'
                  }" />
                  <div class="flex-1 min-w-0 p-3">
                    <div class="flex items-start gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span v-if="item.role !== 'event'" class="chip" :class="ROLE_META[item.role].bg + ' ' + ROLE_META[item.role].color">
                            <component :is="ROLE_META[item.role].icon" class="w-3 h-3" :stroke-width="2" />
                            {{ ROLE_META[item.role].label }}
                          </span>
                          <span v-else class="chip" :class="typeMeta(item.type).badge">
                            <component :is="typeMeta(item.type).icon" class="w-3 h-3" :stroke-width="2" />
                            {{ typeMeta(item.type).label }}
                          </span>
                          <span v-if="item.priority !== 'normal'" class="chip" :class="priorityMeta(item.priority).color">
                            <component :is="priorityMeta(item.priority).icon" class="w-3 h-3" :stroke-width="2" />
                            {{ priorityMeta(item.priority).label }}
                          </span>
                        </div>
                        <h4 class="font-semibold text-[15px] leading-tight tracking-tight mt-1" :class="{ 'line-through text-slate-400': item.isDone }">{{ item.name }}</h4>
                        <p v-if="item.category" class="text-xs text-slate-500 mt-0.5">{{ item.category }}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap text-xs">
                          <span v-if="item.city" class="text-slate-500 flex items-center gap-1"><MapPin class="w-3 h-3" :stroke-width="2" />{{ item.city }}</span>
                          <span v-if="item.price > 0 && item.role !== 'night'" class="font-semibold text-slate-900">{{ new Intl.NumberFormat('fr-FR').format(item.price) }} {{ symbol }}</span>
                          <span v-if="item.isBooked" class="text-emerald-600 flex items-center gap-0.5"><BadgeCheck class="w-3 h-3" :stroke-width="2" />Réservé</span>
                        </div>
                      </div>
                      <button
                        v-if="canEdit && item.role !== 'night'"
                        @click="toggleDone(item)"
                        class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ring-1 transition"
                        :class="item.isDone ? 'bg-emerald-500 text-white ring-emerald-500' : 'bg-white text-slate-300 ring-slate-200 hover:ring-slate-300'"
                        aria-label="Toggle"
                      >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      </button>
                    </div>
                    <div class="flex gap-1 mt-2 -mr-1">
                      <button v-if="item.googleMapsUrl" @click="openMaps(item)" class="btn-icon !w-7 !h-7" aria-label="Maps">
                        <MapPin class="w-3.5 h-3.5" :stroke-width="2" />
                      </button>
                      <button v-if="item.bookingUrl" @click="openBooking(item)" class="btn-icon !w-7 !h-7" aria-label="Site">
                        <ExternalLink class="w-3.5 h-3.5" :stroke-width="2" />
                      </button>
                      <button v-if="canEdit" @click="props.onEdit && props.onEdit(item)" class="btn-icon !w-7 !h-7 ml-auto" aria-label="Éditer">
                        <Pencil class="w-3.5 h-3.5" :stroke-width="2" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
