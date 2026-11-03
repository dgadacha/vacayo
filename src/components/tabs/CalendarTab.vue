<script setup>
import { ref, computed, watch, onMounted, nextTick, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import {
  ChevronLeft, ChevronRight, CalendarDays, BedDouble, LogIn, LogOut, Moon, Clock,
  MapPin, ExternalLink, Pencil, Sunrise, Sun, Sunset, BadgeCheck, Check, Sparkles, Plus, Wand2
} from 'lucide-vue-next'
import {
  parseDate, formatDate, formatTime, formatDayKey, expandHotelDates,
  addDays, differenceInCalendarDays, isSameDay, startOfDay,
  startOfMonth, isSameMonth, addMonths
} from '@/utils/helpers'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'

const props = defineProps({ onEdit: Function, onView: Function })

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(true))
const aiActions = inject('aiActions', null)
const symbol = computed(() => trip.value?.currencySymbol || '€')

const selectedDate = ref(null)

// Full list of days: the trip range, or the span of dated items
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
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) days.push(cur)
  return days
})

const selectedIdx = computed(() => {
  if (!selectedDate.value || !allDays.value.length) return 0
  const idx = allDays.value.findIndex(d => isSameDay(d, selectedDate.value))
  return idx === -1 ? 0 : idx
})
const dayCount = computed(() => allDays.value.length)

const monthsInTrip = computed(() => {
  if (!allDays.value.length) return []
  const months = []
  const last = startOfMonth(allDays.value[allDays.value.length - 1])
  for (let cur = startOfMonth(allDays.value[0]); cur <= last; cur = addMonths(cur, 1)) months.push(cur)
  return months
})
const currentMonth = computed(() => selectedDate.value ? startOfMonth(selectedDate.value) : null)
const currentMonthIdx = computed(() =>
  currentMonth.value ? monthsInTrip.value.findIndex(m => isSameMonth(m, currentMonth.value)) : -1
)
const canPrevMonth = computed(() => currentMonthIdx.value > 0)
const canNextMonth = computed(() => currentMonthIdx.value >= 0 && currentMonthIdx.value < monthsInTrip.value.length - 1)
const daysInCurrentMonth = computed(() =>
  currentMonth.value ? allDays.value.filter(d => isSameMonth(d, currentMonth.value)) : []
)

function goMonth(delta) {
  const idx = currentMonthIdx.value + delta
  if (idx < 0 || idx >= monthsInTrip.value.length) return
  const targetMonth = monthsInTrip.value[idx]
  const today = startOfDay(new Date())
  const todayInMonth = isSameMonth(today, targetMonth) ? allDays.value.find(d => isSameDay(d, today)) : null
  selectedDate.value = todayInMonth || allDays.value.find(d => isSameMonth(d, targetMonth))
}

// Default: today if in range, else first day with something, else first day
function initSelectedDate() {
  if (!allDays.value.length) return
  const today = startOfDay(new Date())
  const inRange = allDays.value.find(d => isSameDay(d, today))
  if (inRange) { selectedDate.value = inRange; return }
  const firstWithActivity = activities.calendarDays[0]?.key
  selectedDate.value = firstWithActivity ? parseDate(firstWithActivity) : allDays.value[0]
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
}
function pick(d) { selectedDate.value = d }

const stripRef = ref(null)
function scrollSelectedIntoView(behavior = 'smooth') {
  const el = stripRef.value?.querySelector('[data-selected="true"]')
  if (el?.scrollIntoView) el.scrollIntoView({ inline: 'center', block: 'nearest', behavior })
}
watch(selectedDate, () => nextTick(() => scrollSelectedIntoView()))

// Items of the selected day, hotels tagged with their role that day
const dayItems = computed(() => {
  if (!selectedDate.value) return []
  const key = formatDayKey(selectedDate.value)
  const list = []
  activities.tripActivities.forEach(a => {
    if (a.type === 'hotel') {
      if (!expandHotelDates(a).some(d => formatDayKey(d) === key)) return
      const isCheckIn = a.date && formatDayKey(a.date) === key
      const isCheckOut = a.endDate && formatDayKey(a.endDate) === key
      if (isCheckIn) list.push({ ...a, role: 'checkin', displayTime: formatTime(a.date) || '15:00' })
      else if (isCheckOut) list.push({ ...a, role: 'checkout', displayTime: formatTime(a.endDate) || '11:00' })
      else list.push({ ...a, role: 'night', displayTime: '' })
    } else if (a.date && formatDayKey(a.date) === key) {
      list.push({ ...a, role: 'event', displayTime: formatTime(a.date) })
    }
  })
  const order = { checkout: 0, event: 1, night: 2, checkin: 3 }
  return list.sort((a, b) => (a.displayTime || '99:99').localeCompare(b.displayTime || '99:99') || order[a.role] - order[b.role])
})

const isToday = computed(() => selectedDate.value && isSameDay(selectedDate.value, new Date()))
const dayOffset = computed(() => {
  if (!selectedDate.value || !allDays.value.length) return null
  return differenceInCalendarDays(selectedDate.value, allDays.value[0])
})
const dayHotel = computed(() => dayItems.value.find(i => i.role === 'night' || i.role === 'checkin') || dayItems.value.find(i => i.role === 'checkout'))
const dayPrice = computed(() => dayItems.value.filter(i => i.role === 'event').reduce((s, i) => s + (Number(i.price) || 0), 0))
const wishlistCount = computed(() => activities.all.filter(a => a.type !== 'hotel' && !a.date).length)

function periodOfDay(time) {
  if (!time) return 'all-day'
  const h = Number(time.split(':')[0])
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
  { key: 'morning', label: 'Matin', icon: Sunrise },
  { key: 'afternoon', label: 'Après-midi', icon: Sun },
  { key: 'evening', label: 'Soir', icon: Sunset },
  { key: 'all-day', label: 'Sans horaire', icon: Clock }
]

const ROLE_META = {
  checkin: { label: 'Arrivée', icon: LogIn, tone: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/30', bar: 'bg-sky-500' },
  checkout: { label: 'Départ', icon: LogOut, tone: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30', bar: 'bg-amber-500' },
  night: { label: 'Nuitée', icon: Moon, tone: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30', bar: 'bg-violet-500' }
}

function typeMeta(t) { return ACTIVITY_TYPES[t] || ACTIVITY_TYPES.activity }
function priorityMeta(p) { return PRIORITY_OPTIONS.find(o => o.value === p) || PRIORITY_OPTIONS[2] }
function openLink(url) { url && window.open(url, '_blank', 'noopener') }
function toggleDone(a) { activities.toggleDone(a.id) }
function view(item) {
  const original = activities.all.find(a => a.id === item.id)
  if (original) props.onView?.(original)
}

function dayHasItems(d) {
  return activities.calendarDays.find(c => c.key === formatDayKey(d))?.items.length || 0
}

function addOnDay() {
  props.onEdit?.({ date: selectedDate.value ? formatDayKey(selectedDate.value) + 'T10:00' : '' })
}
function askAiForDay() {
  const label = formatDate(selectedDate.value, 'EEEE d MMMM')
  const city = dayHotel.value?.city
  const prompt = dayItems.value.some(i => i.role === 'event')
    ? `Regarde mon programme du ${label} : est-ce que l'ordre et les horaires sont réalistes ? Propose un enchaînement optimisé et ce qu'il manque.`
    : `Ma journée du ${label}${city ? ` à ${city}` : ''} est libre. Propose-moi un programme (matin, midi, après-midi, soir) en t'appuyant d'abord sur ma wishlist.`
  aiActions?.openChat(prompt)
}
</script>

<template>
  <div class="pb-4 pt-3">
    <!-- Sticky planning header -->
    <div class="sticky z-20 backdrop-blur-xl border-y" style="top: var(--vc-topbar-h, 0px); background: color-mix(in srgb, var(--vc-bg) 90%, transparent); border-color: var(--vc-border-soft)">
      <div class="px-3 pt-2 pb-1 flex items-center gap-2">
        <button type="button" class="btn-icon disabled:opacity-30 disabled:pointer-events-none" :disabled="!canPrevMonth" aria-label="Mois précédent" @click="goMonth(-1)">
          <ChevronLeft class="w-5 h-5" :stroke-width="2" />
        </button>
        <h2 class="flex-1 text-center text-[15px] font-bold tracking-tight capitalize">{{ formatDate(currentMonth, 'MMMM yyyy') }}</h2>
        <button type="button" class="btn-icon disabled:opacity-30 disabled:pointer-events-none" :disabled="!canNextMonth" aria-label="Mois suivant" @click="goMonth(1)">
          <ChevronRight class="w-5 h-5" :stroke-width="2" />
        </button>
      </div>

      <div v-if="daysInCurrentMonth.length" ref="stripRef" data-no-swipe class="px-3 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide snap-x">
        <button
          v-for="d in daysInCurrentMonth"
          :key="formatDayKey(d)"
          type="button"
          :data-selected="isSameDay(d, selectedDate)"
          class="day flex-shrink-0 snap-center w-12 rounded-2xl py-2 flex flex-col items-center transition relative"
          :aria-pressed="isSameDay(d, selectedDate)"
          :aria-label="formatDate(d, 'EEEE d MMMM')"
          @click="pick(d)"
        >
          <span class="text-[10px] font-semibold uppercase tracking-wider opacity-70">{{ formatDate(d, 'EEE').replace('.', '') }}</span>
          <span class="text-lg font-bold leading-tight mt-0.5">{{ formatDate(d, 'd') }}</span>
          <span class="mt-1 w-1 h-1 rounded-full" :class="dayHasItems(d) ? 'dot' : 'bg-transparent'" />
          <span v-if="isSameDay(d, new Date()) && !isSameDay(d, selectedDate)" class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
        </button>
      </div>
    </div>

    <!-- Selected day -->
    <div class="px-4 pt-4 flex items-start gap-2">
      <button type="button" class="btn-icon !w-8 !h-8 mt-0.5 disabled:opacity-30" :disabled="selectedIdx === 0" aria-label="Jour précédent" @click="go(-1)">
        <ChevronLeft class="w-4 h-4" :stroke-width="2" />
      </button>
      <div class="flex-1 min-w-0 text-center">
        <h3 class="text-lg font-bold tracking-tight truncate first-letter:uppercase">{{ formatDate(selectedDate, 'EEEE d MMMM') }}</h3>
        <div class="flex items-center justify-center gap-1.5 text-xs text-muted mt-0.5 flex-wrap">
          <span v-if="isToday" class="font-semibold text-rose-500">Aujourd'hui</span>
          <span v-else-if="dayOffset !== null && dayCount > 0 && dayOffset >= 0">Jour {{ dayOffset + 1 }} / {{ dayCount }}</span>
          <template v-if="dayHotel">
            <span class="text-subtle">·</span>
            <span class="flex items-center gap-1 min-w-0"><BedDouble class="w-3.5 h-3.5 flex-shrink-0" :stroke-width="2" /><span class="truncate max-w-[9rem]">{{ dayHotel.city || dayHotel.name }}</span></span>
          </template>
          <template v-if="dayPrice > 0">
            <span class="text-subtle">·</span>
            <span>{{ new Intl.NumberFormat('fr-FR').format(dayPrice) }} {{ symbol }}</span>
          </template>
        </div>
      </div>
      <button type="button" class="btn-icon !w-8 !h-8 mt-0.5 disabled:opacity-30" :disabled="selectedIdx >= dayCount - 1" aria-label="Jour suivant" @click="go(1)">
        <ChevronRight class="w-4 h-4" :stroke-width="2" />
      </button>
    </div>

    <div v-if="aiActions && selectedDate" class="px-4 mt-3 flex gap-2 justify-center">
      <button type="button" class="ai-pill" @click="askAiForDay">
        <Sparkles class="w-3.5 h-3.5" :stroke-width="2" />{{ dayItems.some(i => i.role === 'event') ? 'Optimiser la journée' : 'Idées pour ce jour' }}
      </button>
      <button v-if="canEdit && wishlistCount > 0" type="button" class="ai-pill" @click="aiActions.openPlan()">
        <Wand2 class="w-3.5 h-3.5" :stroke-width="2" />Planifier la wishlist ({{ wishlistCount }})
      </button>
    </div>

    <!-- No dates at all -->
    <div v-if="!allDays.length" class="text-center py-16 px-6">
      <CalendarDays class="w-10 h-10 mx-auto text-subtle" :stroke-width="1.5" />
      <p class="mt-3 font-semibold">Pas encore de dates</p>
      <p class="text-sm text-muted mt-1">Ajoute les dates du voyage ou des éléments datés pour voir le planning.</p>
    </div>

    <!-- Free day -->
    <div v-else-if="dayItems.length === 0" class="text-center py-12 px-6">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl surface-2 text-subtle mb-3">
        <Sun class="w-7 h-7" :stroke-width="1.5" />
      </div>
      <h3 class="font-semibold text-base">Journée libre</h3>
      <p class="text-muted text-sm mt-1">Rien de prévu pour l'instant.</p>
      <button v-if="canEdit" type="button" class="btn btn-secondary mt-4 !h-9 !text-xs" @click="addOnDay">
        <Plus class="w-4 h-4" :stroke-width="2.5" />Ajouter ce jour-là
      </button>
    </div>

    <!-- Timeline -->
    <div v-else class="px-4 pt-5 space-y-5">
      <template v-for="p in PERIODS" :key="p.key">
        <section v-if="grouped[p.key].length">
          <div class="flex items-center gap-2 mb-2.5">
            <component :is="p.icon" class="w-4 h-4 text-subtle" :stroke-width="2" />
            <h4 class="section-label">{{ p.label }}</h4>
          </div>

          <div class="relative pl-12">
            <div class="absolute left-[1.125rem] top-2 bottom-2 w-px" style="background: var(--vc-border)" />

            <div v-for="(item, i) in grouped[p.key]" :key="item.id + i" class="relative pb-3 last:pb-0">
              <div class="absolute left-[-2.625rem] top-1.5 w-9 h-9 rounded-full ring-2 flex items-center justify-center text-[10.5px] font-bold surface"
                :class="item.role === 'event' ? 'ring-[color:var(--vc-border)]' : ROLE_META[item.role].tone">
                <template v-if="item.displayTime">{{ item.displayTime }}</template>
                <component :is="ROLE_META[item.role]?.icon || Clock" v-else class="w-4 h-4" :stroke-width="2" />
              </div>

              <article class="card overflow-hidden cursor-pointer" :class="{ 'opacity-60': item.isDone }" @click="view(item)">
                <div class="flex">
                  <div v-if="item.role !== 'event'" class="w-1 flex-shrink-0" :class="ROLE_META[item.role].bar" />
                  <div class="flex-1 min-w-0 p-3">
                    <div class="flex items-start gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                          <span v-if="item.role !== 'event'" class="chip" :class="ROLE_META[item.role].tone">
                            <component :is="ROLE_META[item.role].icon" class="w-3 h-3" :stroke-width="2" />{{ ROLE_META[item.role].label }}
                          </span>
                          <span v-else class="chip" :class="typeMeta(item.type).badge">
                            <component :is="typeMeta(item.type).icon" class="w-3 h-3" :stroke-width="2" />{{ typeMeta(item.type).label }}
                          </span>
                          <span v-if="item.priority && item.priority !== 'normal'" class="chip" :class="priorityMeta(item.priority).color">
                            <component :is="priorityMeta(item.priority).icon" class="w-3 h-3" :stroke-width="2" />{{ priorityMeta(item.priority).label }}
                          </span>
                        </div>
                        <h5 class="font-semibold text-[15px] leading-tight tracking-tight mt-1.5" :class="{ 'line-through': item.isDone }">{{ item.name }}</h5>
                        <div class="flex items-center gap-x-2 gap-y-0.5 mt-1 flex-wrap text-xs text-muted">
                          <span v-if="item.category">{{ item.category }}</span>
                          <span v-if="item.city" class="flex items-center gap-0.5"><MapPin class="w-3 h-3" :stroke-width="2" />{{ item.city }}</span>
                          <span v-if="item.price > 0 && item.role !== 'night'" class="font-semibold" style="color: var(--vc-text)">{{ new Intl.NumberFormat('fr-FR').format(item.price) }} {{ symbol }}</span>
                          <span v-if="item.isBooked" class="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><BadgeCheck class="w-3 h-3" :stroke-width="2" />Réservé</span>
                        </div>
                      </div>
                      <button
                        v-if="canEdit && item.role !== 'night'"
                        type="button"
                        class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ring-1 transition"
                        :class="item.isDone ? 'bg-emerald-500 text-white ring-emerald-500' : 'text-transparent ring-slate-200 dark:ring-slate-600'"
                        :aria-label="item.isDone ? 'Marquer à faire' : 'Marquer comme fait'"
                        @click.stop="toggleDone(item)"
                      >
                        <Check class="w-4 h-4" :stroke-width="3" />
                      </button>
                    </div>
                    <div v-if="item.googleMapsUrl || item.bookingUrl || canEdit" class="flex gap-1 mt-2 -mb-1 -mr-1">
                      <button v-if="item.googleMapsUrl" type="button" class="btn-icon !w-7 !h-7 text-muted" aria-label="Ouvrir dans Maps" @click.stop="openLink(item.googleMapsUrl)">
                        <MapPin class="w-3.5 h-3.5" :stroke-width="2" />
                      </button>
                      <button v-if="item.bookingUrl" type="button" class="btn-icon !w-7 !h-7 text-muted" aria-label="Ouvrir le lien" @click.stop="openLink(item.bookingUrl)">
                        <ExternalLink class="w-3.5 h-3.5" :stroke-width="2" />
                      </button>
                      <button v-if="canEdit" type="button" class="btn-icon !w-7 !h-7 ml-auto text-muted" aria-label="Modifier" @click.stop="props.onEdit?.(activities.all.find(a => a.id === item.id))">
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
.day { background: var(--vc-surface); border: 1px solid var(--vc-border-soft); color: var(--vc-text); }
.day[aria-pressed='true'] { background: var(--vc-text); border-color: var(--vc-text); color: var(--vc-bg); }
.day .dot { background: var(--vc-primary); }
.day[aria-pressed='true'] .dot { background: var(--vc-bg); }
.ai-pill {
  @apply inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition;
  background: var(--vc-primary-soft);
  color: var(--vc-primary);
}
.ai-pill:active { transform: scale(0.97); }
</style>
