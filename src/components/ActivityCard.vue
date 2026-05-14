<script setup>
import { computed, inject, ref, onBeforeUnmount } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatPrice, formatDate, formatTime, colorFromString } from '@/utils/helpers'
import { Check, MapPin, ExternalLink, Pencil, Trash2, BadgeCheck, MoreHorizontal, Copy } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const props = defineProps({
  activity: { type: Object, required: true },
  compact: { type: Boolean, default: false }
})
const emit = defineEmits(['edit', 'view'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(true))
const symbol = computed(() => trip.value?.currencySymbol || '€')
const meta = computed(() => ACTIVITY_TYPES[props.activity.type] || ACTIVITY_TYPES.activity)
const priorityMeta = computed(() =>
  PRIORITY_OPTIONS.find(p => p.value === props.activity.priority) || PRIORITY_OPTIONS[2]
)
const placeholderGradient = computed(() => colorFromString(props.activity.name))
const toast = useToast()
const { confirm } = useConfirm()

const dateLabel = computed(() => {
  const a = props.activity
  if (!a.date) return ''
  if (a.type === 'hotel' && a.endDate) {
    return `${formatDate(a.date, 'd MMM')} → ${formatDate(a.endDate, 'd MMM')}`
  }
  const t = formatTime(a.date)
  return `${formatDate(a.date, 'd MMM')}${t ? ' · ' + t : ''}`
})

function toggleDone() { activities.toggleDone(props.activity.id) }
function toggleBooked() { activities.toggleBooked(props.activity.id) }
function openMaps() { props.activity.googleMapsUrl && window.open(props.activity.googleMapsUrl, '_blank', 'noopener') }
function openBooking() { props.activity.bookingUrl && window.open(props.activity.bookingUrl, '_blank', 'noopener') }

async function remove() {
  const ok = await confirm({
    title: `Supprimer "${props.activity.name}" ?`,
    confirmLabel: 'Supprimer',
    destructive: true
  })
  if (!ok) return
  try {
    await activities.deleteActivity(props.activity.id)
    toast.success('Supprimé')
  } catch (e) { toast.error(e.message || 'Erreur') }
}

async function duplicate() {
  try {
    const a = props.activity
    await activities.addActivity({ ...a, name: a.name + ' (copie)', isDone: false })
    toast.success('Dupliqué')
  } catch (e) { toast.error(e.message || 'Erreur') }
}

// Long-press handling
const showActions = ref(false)
let pressTimer = null
let pressed = false
let longPressed = false

function startPress() {
  if (!canEdit.value) return
  pressed = true
  longPressed = false
  pressTimer = setTimeout(() => {
    if (pressed) {
      longPressed = true
      showActions.value = true
      if (navigator.vibrate) navigator.vibrate(20)
      window.dispatchEvent(new CustomEvent('vacayo:long-press'))
    }
  }, 450)
}
function endPress() {
  pressed = false
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
}
function onContextMenu(e) {
  if (!canEdit.value) return
  e.preventDefault()
  showActions.value = true
}
function closeActions() { showActions.value = false }
onBeforeUnmount(() => { if (pressTimer) clearTimeout(pressTimer) })

// Card click → open detail view (unless long-press fired or click came from a button)
function onCardClick(e) {
  if (longPressed) { longPressed = false; return }
  if (e.target.closest('button, a')) return
  emit('view', props.activity)
}

const actionSheetItems = computed(() => [
  { name: 'Modifier', key: 'edit' },
  { name: props.activity.isDone ? 'Marquer à faire' : 'Marquer fait', key: 'done' },
  { name: props.activity.isBooked ? 'Marquer non réservé' : 'Marquer réservé', key: 'booked' },
  { name: 'Dupliquer', key: 'duplicate' },
  { name: 'Supprimer', key: 'delete', color: '#dc2626' }
])

async function onActionSelect(item) {
  showActions.value = false
  switch (item.key) {
    case 'edit': emit('edit', props.activity); break
    case 'done': toggleDone(); break
    case 'booked': toggleBooked(); break
    case 'duplicate': await duplicate(); break
    case 'delete': await remove(); break
  }
}
</script>

<template>
  <article
    class="card-hover overflow-hidden transition relative no-tap-highlight cursor-pointer"
    :class="{ 'opacity-60': activity.isDone }"
    @click="onCardClick"
    @touchstart.passive="startPress"
    @touchend.passive="endPress"
    @touchmove.passive="endPress"
    @touchcancel.passive="endPress"
    @contextmenu="onContextMenu"
  >
    <div class="flex">
      <div class="w-24 sm:w-28 flex-shrink-0 relative">
        <img
          v-if="activity.photoUrl"
          :src="activity.photoUrl"
          :alt="activity.name"
          class="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          @error="$event.target.style.display='none'"
        />
        <div
          v-else
          class="absolute inset-0 flex items-center justify-center bg-gradient-to-br text-white"
          :class="placeholderGradient"
        >
          <component :is="meta.iconBig" class="w-7 h-7" :stroke-width="1.5" />
        </div>
        <span v-if="activity.priority !== 'normal'" class="absolute top-1.5 left-1.5 chip" :class="priorityMeta.color">
          <span class="w-1.5 h-1.5 rounded-full" :class="priorityMeta.dot" />
          {{ priorityMeta.label }}
        </span>
      </div>

      <div class="flex-1 min-w-0 p-3 flex flex-col">
        <div class="flex items-start gap-2">
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-[15px] leading-tight tracking-tight truncate" :class="{ 'line-through text-slate-400 dark:text-slate-500': activity.isDone }">
              {{ activity.name }}
            </h3>
            <p v-if="activity.category" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{{ activity.category }}</p>
            <p v-if="activity.city" class="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate flex items-center gap-1">
              <MapPin class="w-3 h-3" :stroke-width="2" />
              {{ activity.city }}
            </p>
          </div>
          <button
            v-if="canEdit"
            @click.stop="toggleDone"
            class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition ring-1"
            :class="activity.isDone ? 'bg-emerald-500 text-white ring-emerald-500' : 'bg-white dark:bg-slate-900 text-slate-300 dark:text-slate-600 ring-slate-200 dark:ring-slate-700 hover:ring-slate-300 dark:hover:ring-slate-600'"
            :aria-label="activity.isDone ? 'Marquer non fait' : 'Marquer fait'"
          >
            <Check class="w-4 h-4" :stroke-width="3" />
          </button>
          <span
            v-else-if="activity.isDone"
            class="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center"
          >
            <Check class="w-4 h-4" :stroke-width="3" />
          </span>
        </div>

        <div class="flex items-center gap-2 mt-1.5 flex-wrap text-xs">
          <span v-if="activity.price > 0" class="font-bold text-slate-900 dark:text-slate-100">{{ formatPrice(activity.price, symbol) }}</span>
          <span v-if="dateLabel" class="text-slate-500 dark:text-slate-400">{{ dateLabel }}</span>
          <span v-if="activity.isBooked" class="chip bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900">
            <BadgeCheck class="w-3 h-3" :stroke-width="2.5" />
            Réservé
          </span>
        </div>

        <div v-if="!compact" class="flex gap-1 mt-2 -mr-1">
          <button v-if="activity.googleMapsUrl" @click.stop="openMaps" class="btn-icon !w-8 !h-8" aria-label="Maps">
            <MapPin class="w-4 h-4" :stroke-width="2" />
          </button>
          <button v-if="activity.bookingUrl" @click.stop="openBooking" class="btn-icon !w-8 !h-8" aria-label="Site web">
            <ExternalLink class="w-4 h-4" :stroke-width="2" />
          </button>
          <button v-if="canEdit" @click.stop="emit('edit', activity)" class="btn-icon !w-8 !h-8 ml-auto" aria-label="Éditer">
            <Pencil class="w-4 h-4" :stroke-width="2" />
          </button>
          <button v-if="canEdit" @click.stop="showActions = true" class="btn-icon !w-8 !h-8" aria-label="Plus d'actions">
            <MoreHorizontal class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>
      </div>
    </div>

    <van-action-sheet
      :show="showActions"
      @update:show="showActions = $event"
      :title="activity.name"
      teleport="body"
      cancel-text="Annuler"
      close-on-click-action
      :actions="actionSheetItems"
      @select="onActionSelect"
      @cancel="closeActions"
    />
  </article>
</template>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
