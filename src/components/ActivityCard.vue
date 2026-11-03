<script setup>
import { computed, inject, ref, onBeforeUnmount } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatDate, formatTime, colorFromString, nightsBetween } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { Check, CalendarDays, MapPin, BadgeCheck, MoreHorizontal, Moon } from 'lucide-vue-next'

const props = defineProps({
  activity: { type: Object, required: true }
})
const emit = defineEmits(['edit', 'view'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(true))
const symbol = computed(() => trip.value?.currencySymbol || '€')
const meta = computed(() => ACTIVITY_TYPES[props.activity.type] || ACTIVITY_TYPES.activity)
const priorityMeta = computed(() => PRIORITY_OPTIONS.find(p => p.value === props.activity.priority) || PRIORITY_OPTIONS[2])
const placeholderGradient = computed(() => colorFromString(props.activity.name))
const toast = useToast()
const { confirm } = useConfirm()
const imgFailed = ref(false)

const dateLabel = computed(() => {
  const a = props.activity
  if (!a.date) return ''
  if (a.type === 'hotel' && a.endDate) return `${formatDate(a.date, 'EEE d MMM')} → ${formatDate(a.endDate, 'EEE d MMM')}`
  const t = formatTime(a.date)
  return `${formatDate(a.date, 'EEE d MMM')}${t ? ' · ' + t : ''}`
})
const nights = computed(() => props.activity.type === 'hotel' ? nightsBetween(props.activity.date, props.activity.endDate) : 0)
const priceLabel = computed(() => {
  const n = Number(props.activity.price) || 0
  return n ? `${new Intl.NumberFormat('fr-FR').format(n)} ${symbol.value}` : ''
})
const subtitle = computed(() => [props.activity.category, props.activity.city].filter(Boolean).join(' · '))

function toggleDone() {
  activities.toggleDone(props.activity.id)
  if (navigator.vibrate) navigator.vibrate(10)
}

async function remove() {
  const ok = await confirm({ title: `Supprimer « ${props.activity.name} » ?`, confirmLabel: 'Supprimer', destructive: true })
  if (!ok) return
  try { await activities.deleteActivity(props.activity.id); toast.success('Supprimé') }
  catch (e) { toast.error(e.message || 'Erreur') }
}

async function duplicate() {
  try {
    const a = props.activity
    await activities.addActivity({ ...a, name: a.name + ' (copie)', isDone: false })
    toast.success('Dupliqué')
  } catch (e) { toast.error(e.message || 'Erreur') }
}

// Long press (or right click) opens the actions sheet
const showActions = ref(false)
let pressTimer = null
let longPressed = false

function startPress() {
  if (!canEdit.value) return
  longPressed = false
  pressTimer = setTimeout(() => {
    longPressed = true
    showActions.value = true
    if (navigator.vibrate) navigator.vibrate(20)
    window.dispatchEvent(new CustomEvent('vacayo:long-press'))
  }, 450)
}
function endPress() {
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
}
function onContextMenu(e) {
  if (!canEdit.value) return
  e.preventDefault()
  showActions.value = true
}
onBeforeUnmount(endPress)

function onCardClick(e) {
  if (longPressed) { longPressed = false; return }
  if (e.target.closest('button, a')) return
  emit('view', props.activity)
}

const actionSheetItems = computed(() => {
  const a = props.activity
  return [
    { name: 'Modifier', key: 'edit' },
    { name: a.isDone ? 'Marquer à faire' : 'Marquer comme fait', key: 'done' },
    { name: a.isBooked ? 'Marquer non réservé' : 'Marquer réservé', key: 'booked' },
    a.googleMapsUrl && { name: 'Ouvrir dans Maps', key: 'maps' },
    a.bookingUrl && { name: 'Ouvrir le lien de réservation', key: 'booking' },
    { name: 'Dupliquer', key: 'duplicate' },
    { name: 'Supprimer', key: 'delete', color: '#e11d48' }
  ].filter(Boolean)
})

async function onActionSelect(item) {
  showActions.value = false
  const a = props.activity
  switch (item.key) {
    case 'edit': emit('edit', a); break
    case 'done': toggleDone(); break
    case 'booked': activities.toggleBooked(a.id); break
    case 'maps': window.open(a.googleMapsUrl, '_blank', 'noopener'); break
    case 'booking': window.open(a.bookingUrl, '_blank', 'noopener'); break
    case 'duplicate': await duplicate(); break
    case 'delete': await remove(); break
  }
}
</script>

<template>
  <article
    class="card flex gap-3 p-2.5 pr-3 cursor-pointer no-tap-highlight transition active:scale-[0.99] select-none"
    :class="{ 'opacity-60': activity.isDone }"
    @click="onCardClick"
    @touchstart.passive="startPress"
    @touchend.passive="endPress"
    @touchmove.passive="endPress"
    @touchcancel.passive="endPress"
    @contextmenu="onContextMenu"
  >
    <div class="w-[76px] h-[76px] rounded-xl overflow-hidden relative flex-shrink-0 bg-gradient-to-br" :class="placeholderGradient">
      <img v-if="activity.photoUrl && !imgFailed" :src="activity.photoUrl" :alt="activity.name" class="absolute inset-0 w-full h-full object-cover" loading="lazy" @error="imgFailed = true" />
      <div v-else class="absolute inset-0 flex items-center justify-center text-white/95">
        <component :is="meta.iconBig" class="w-7 h-7" :stroke-width="1.5" />
      </div>
      <div v-if="activity.isDone" class="absolute inset-0 bg-emerald-600/70 flex items-center justify-center text-white">
        <Check class="w-8 h-8" :stroke-width="3" />
      </div>
    </div>

    <div class="flex-1 min-w-0 py-0.5">
      <div class="flex items-start gap-2">
        <h3 class="flex-1 font-semibold text-[15px] leading-snug line-clamp-2" :class="{ 'line-through': activity.isDone }">{{ activity.name }}</h3>
        <span v-if="priceLabel" class="text-[13px] font-semibold whitespace-nowrap pt-px">{{ priceLabel }}</span>
      </div>
      <p v-if="subtitle" class="text-[13px] text-muted truncate mt-0.5">{{ subtitle }}</p>
      <p class="text-xs mt-1 flex items-center gap-1" :class="dateLabel ? 'text-muted' : 'text-subtle italic'">
        <CalendarDays class="w-3.5 h-3.5 flex-shrink-0 not-italic" :stroke-width="2" />
        <span class="truncate capitalize-first">{{ dateLabel || 'Sans date' }}</span>
        <span v-if="nights" class="flex items-center gap-0.5 text-subtle ml-1 whitespace-nowrap"><Moon class="w-3 h-3" :stroke-width="2" />{{ nights }}</span>
      </p>
      <div v-if="activity.priority !== 'normal' || activity.isBooked" class="flex flex-wrap gap-1 mt-1.5">
        <span v-if="activity.priority && activity.priority !== 'normal'" class="chip" :class="priorityMeta.color">
          <component :is="priorityMeta.icon" class="w-3 h-3" :stroke-width="2" />{{ priorityMeta.label }}
        </span>
        <span v-if="activity.isBooked" class="chip bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30">
          <BadgeCheck class="w-3 h-3" :stroke-width="2" />Réservé
        </span>
      </div>
    </div>

    <div v-if="canEdit" class="flex flex-col items-center justify-between -my-0.5 -mr-1">
      <button
        type="button"
        class="w-8 h-8 rounded-full flex items-center justify-center ring-1 transition"
        :class="activity.isDone ? 'bg-emerald-500 text-white ring-emerald-500' : 'ring-slate-200 dark:ring-slate-600 text-transparent hover:text-slate-300'"
        :aria-label="activity.isDone ? 'Marquer à faire' : 'Marquer comme fait'"
        :aria-pressed="activity.isDone"
        @click.stop="toggleDone"
      >
        <Check class="w-4 h-4" :stroke-width="3" />
      </button>
      <button type="button" class="btn-icon !w-8 !h-8 text-muted" aria-label="Plus d'actions" @click.stop="showActions = true">
        <MoreHorizontal class="w-4 h-4" :stroke-width="2" />
      </button>
    </div>

    <!-- Inside the article so the card keeps a single root (list animations); teleported anyway -->
    <van-action-sheet
      v-model:show="showActions"
      :title="activity.name"
      teleport="body"
      cancel-text="Annuler"
      close-on-click-action
      :actions="actionSheetItems"
      @select="onActionSelect"
    />
  </article>
</template>

<style scoped>
.capitalize-first::first-letter { text-transform: uppercase; }
</style>
