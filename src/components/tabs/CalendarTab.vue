<script setup>
import { ref, computed, watch, onMounted, nextTick, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ChevronLeft, ChevronRight, CalendarDays, Check, Sparkles, Wand2, Plus, BadgeCheck, LogIn, LogOut, Moon } from 'lucide-vue-next'
import {
  parseDate, formatDate, formatTime, formatDayKey, expandHotelDates,
  addDays, differenceInCalendarDays, isSameDay, startOfDay,
  startOfMonth, isSameMonth, addMonths
} from '@/utils/helpers'
import { ACTIVITY_TYPES } from '@/utils/constants'

// Calendar app–style planning: a strip of days, then the selected day as a list.
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
const hasEvents = computed(() => dayItems.value.some(i => i.role === 'event'))
const wishlistCount = computed(() => activities.all.filter(a => a.type !== 'hotel' && !a.date).length)
const daySubtitle = computed(() => [
  isToday.value ? "Aujourd'hui" : (dayOffset.value !== null && dayOffset.value >= 0 ? `Jour ${dayOffset.value + 1} sur ${dayCount.value}` : ''),
  dayHotel.value?.city,
  dayPrice.value > 0 ? `${new Intl.NumberFormat('fr-FR').format(dayPrice.value)} ${symbol.value}` : ''
].filter(Boolean).join(' · '))

function periodOfDay(time) {
  if (!time) return 'all-day'
  const h = Number(time.split(':')[0])
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}
const grouped = computed(() => {
  const groups = { 'all-day': [], morning: [], afternoon: [], evening: [] }
  dayItems.value.forEach(i => groups[periodOfDay(i.displayTime)].push(i))
  return groups
})
const PERIODS = [
  { key: 'all-day', label: 'Toute la journée' },
  { key: 'morning', label: 'Matin' },
  { key: 'afternoon', label: 'Après-midi' },
  { key: 'evening', label: 'Soir' }
]

const ROLE_META = {
  checkin: { label: 'Arrivée', icon: LogIn },
  checkout: { label: 'Départ', icon: LogOut },
  night: { label: 'Nuit', icon: Moon }
}

function typeColor(t) { return (ACTIVITY_TYPES[t] || ACTIVITY_TYPES.activity).color }
function toggleDone(a) { activities.toggleDone(a.id) }
function original(item) { return activities.all.find(a => a.id === item.id) }
function view(item) {
  const o = original(item)
  if (o) props.onView?.(o)
}

function dayHasItems(d) {
  return activities.calendarDays.find(c => c.key === formatDayKey(d))?.items.length || 0
}
function dayState(d) {
  const sel = isSameDay(d, selectedDate.value)
  const today = isSameDay(d, new Date())
  if (sel) return today ? 'sel-today' : 'sel'
  return today ? 'today' : ''
}

function addOnDay() {
  props.onEdit?.({ date: selectedDate.value ? formatDayKey(selectedDate.value) + 'T10:00' : '' })
}
function askAiForDay() {
  const label = formatDate(selectedDate.value, 'EEEE d MMMM')
  const city = dayHotel.value?.city
  const prompt = hasEvents.value
    ? `Regarde mon programme du ${label} : est-ce que l'ordre et les horaires sont réalistes ? Propose un enchaînement optimisé et ce qu'il manque.`
    : `Ma journée du ${label}${city ? ` à ${city}` : ''} est libre. Propose-moi un programme (matin, midi, après-midi, soir) en t'appuyant d'abord sur ma liste d'envies (les éléments sans date).`
  aiActions?.openChat(prompt)
}
</script>

<template>
  <div class="pb-6 pt-5">
    <!-- Sticky month + day strip -->
    <div class="sticky z-20 material hairline-b" style="top: var(--vc-topbar-h, 0px)">
      <div class="px-4 pt-2 flex items-center gap-1">
        <h2 class="flex-1 t-title3 first-letter:uppercase">{{ formatDate(currentMonth, 'MMMM yyyy') }}</h2>
        <button type="button" class="btn-icon !w-9 !h-9 disabled:opacity-30" :disabled="!canPrevMonth" aria-label="Mois précédent" @click="goMonth(-1)">
          <ChevronLeft class="w-6 h-6" :stroke-width="2.4" />
        </button>
        <button type="button" class="btn-icon !w-9 !h-9 disabled:opacity-30" :disabled="!canNextMonth" aria-label="Mois suivant" @click="goMonth(1)">
          <ChevronRight class="w-6 h-6" :stroke-width="2.4" />
        </button>
      </div>

      <div v-if="daysInCurrentMonth.length" ref="stripRef" data-no-swipe class="px-2 pt-1 pb-2 flex overflow-x-auto scrollbar-hide snap-x">
        <button
          v-for="d in daysInCurrentMonth"
          :key="formatDayKey(d)"
          type="button"
          :data-selected="isSameDay(d, selectedDate)"
          class="flex-shrink-0 snap-center w-[50px] flex flex-col items-center gap-1 py-1"
          :aria-pressed="isSameDay(d, selectedDate)"
          :aria-label="formatDate(d, 'EEEE d MMMM')"
          @click="pick(d)"
        >
          <span class="text-[11px] font-semibold uppercase text-muted">{{ formatDate(d, 'EEEEE') }}</span>
          <span class="day-num" :class="dayState(d)">{{ formatDate(d, 'd') }}</span>
          <span class="w-[5px] h-[5px] rounded-full" :style="{ background: dayHasItems(d) ? 'var(--vc-gray)' : 'transparent' }" />
        </button>
      </div>
    </div>

    <!-- No dates at all -->
    <div v-if="!allDays.length" class="text-center pt-16 px-8">
      <CalendarDays class="w-12 h-12 mx-auto text-subtle" :stroke-width="1.6" />
      <p class="t-title3 mt-3">Pas encore de dates</p>
      <p class="t-subhead text-muted mt-1">Ajoute les dates du voyage ou des éléments datés pour voir le planning.</p>
    </div>

    <template v-else>
      <!-- Selected day -->
      <div class="px-4 pt-5 flex items-end gap-2">
        <div class="flex-1 min-w-0">
          <h3 class="t-title2 first-letter:uppercase truncate">{{ formatDate(selectedDate, 'EEEE d MMMM') }}</h3>
          <p v-if="daySubtitle" class="t-subhead truncate" :style="{ color: isToday ? 'var(--vc-red)' : 'var(--vc-muted)' }">{{ daySubtitle }}</p>
        </div>
        <button type="button" class="bar-btn" :disabled="selectedIdx === 0" :class="{ 'opacity-30': selectedIdx === 0 }" aria-label="Jour précédent" @click="go(-1)">
          <ChevronLeft class="w-5 h-5" :stroke-width="2.4" />
        </button>
        <button type="button" class="bar-btn" :disabled="selectedIdx >= dayCount - 1" :class="{ 'opacity-30': selectedIdx >= dayCount - 1 }" aria-label="Jour suivant" @click="go(1)">
          <ChevronRight class="w-5 h-5" :stroke-width="2.4" />
        </button>
      </div>

      <div v-if="aiActions && selectedDate" data-no-swipe class="px-4 mt-3 flex gap-2 overflow-x-auto scrollbar-hide">
        <button type="button" class="ai-pill" @click="askAiForDay">
          <Sparkles class="w-4 h-4" :stroke-width="2.2" />{{ hasEvents ? 'Optimiser la journée' : 'Idées pour ce jour' }}
        </button>
        <button v-if="canEdit && wishlistCount > 0" type="button" class="ai-pill" @click="aiActions.openPlan()">
          <Wand2 class="w-4 h-4" :stroke-width="2.2" />Planifier la liste d’envies ({{ wishlistCount }})
        </button>
      </div>

      <!-- Free day -->
      <div v-if="dayItems.length === 0" class="text-center pt-12 px-8">
        <p class="t-title3 text-muted">Aucun événement</p>
        <button v-if="canEdit" type="button" class="btn btn-plain mt-1" @click="addOnDay">
          <Plus class="w-5 h-5" :stroke-width="2.4" />Ajouter ce jour-là
        </button>
      </div>

      <!-- Day list, by period -->
      <template v-for="p in PERIODS" :key="p.key">
        <section v-if="grouped[p.key].length" class="mt-6">
          <h4 class="list-header">{{ p.label }}</h4>
          <div class="list" style="--sep-inset: 88px">
            <div
              v-for="(item, i) in grouped[p.key]"
              :key="item.id + i"
              class="row !items-stretch !py-2.5 cursor-pointer"
              role="button"
              tabindex="0"
              @click="view(item)"
              @keydown.enter="view(item)"
            >
              <div class="w-12 flex-shrink-0 text-right pt-px">
                <p class="t-subhead font-semibold">{{ item.displayTime || (item.role === 'night' ? '' : '—') }}</p>
                <p v-if="item.role !== 'event'" class="t-caption text-muted">{{ ROLE_META[item.role].label }}</p>
              </div>
              <span class="w-1 rounded-full flex-shrink-0" :style="{ background: typeColor(item.type) }" />
              <div class="flex-1 min-w-0" :class="{ 'opacity-50': item.isDone }">
                <p class="t-body font-medium leading-snug" :class="{ 'line-through': item.isDone }">{{ item.name }}</p>
                <p class="t-subhead text-muted truncate">{{ [item.category, item.city].filter(Boolean).join(' · ') }}</p>
                <p v-if="item.isBooked || (item.price > 0 && item.role !== 'night')" class="t-footnote text-muted flex items-center gap-2 mt-0.5">
                  <span v-if="item.price > 0 && item.role !== 'night'">{{ new Intl.NumberFormat('fr-FR').format(item.price) }} {{ symbol }}</span>
                  <span v-if="item.isBooked" class="flex items-center gap-0.5 font-medium" style="color: var(--vc-green)"><BadgeCheck class="w-3.5 h-3.5" :stroke-width="2.2" />Réservé</span>
                </p>
              </div>
              <button
                v-if="canEdit && item.role !== 'night'"
                type="button"
                class="w-[26px] h-[26px] self-center rounded-full flex items-center justify-center flex-shrink-0 transition"
                :style="item.isDone ? { background: 'var(--vc-green)', color: '#fff' } : { boxShadow: 'inset 0 0 0 1.5px var(--vc-subtle)', color: 'transparent' }"
                :aria-label="item.isDone ? 'Marquer à faire' : 'Marquer comme fait'"
                @click.stop="toggleDone(item)"
              >
                <Check class="w-4 h-4" :stroke-width="3" />
              </button>
            </div>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.day-num {
  @apply flex items-center justify-center rounded-full transition;
  width: 36px;
  height: 36px;
  font-size: 20px;
  font-weight: 400;
}
.day-num.today { color: var(--vc-red); font-weight: 600; }
.day-num.sel { background: var(--vc-text); color: var(--vc-bg); font-weight: 600; }
.day-num.sel-today { background: var(--vc-red); color: #fff; font-weight: 600; }
.ai-pill {
  @apply inline-flex items-center gap-1.5 rounded-full whitespace-nowrap flex-shrink-0 transition;
  height: 34px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 500;
  background: var(--vc-surface);
  color: var(--vc-text);
}
.ai-pill > svg { color: #bf5af2; }
.ai-pill:active { opacity: 0.6; }
</style>
