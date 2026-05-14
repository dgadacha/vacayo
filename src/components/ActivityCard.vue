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

async function actionDuplicate() { closeActions(); await duplicate() }
async function actionDelete() { closeActions(); await remove() }
function actionToggleDone() { closeActions(); toggleDone() }
function actionToggleBooked() { closeActions(); toggleBooked() }
function actionEdit() { closeActions(); emit('edit', props.activity) }
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

    <Teleport to="body">
      <Transition name="actions">
        <div v-if="showActions" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closeActions" />
          <div class="relative w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-2 pb-4 sm:pb-2 safe-bottom animate-slide-up shadow-xl">
            <div class="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-2 mb-2 sm:hidden" />
            <div class="px-3 py-2">
              <p class="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">Actions</p>
              <h3 class="font-semibold text-sm truncate">{{ activity.name }}</h3>
            </div>
            <div class="space-y-0.5">
              <button @click="actionEdit" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 text-sm">
                <Pencil class="w-4 h-4 text-slate-500 dark:text-slate-400" :stroke-width="2" />
                <span>Modifier</span>
              </button>
              <button @click="actionToggleDone" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 text-sm">
                <Check class="w-4 h-4 text-emerald-600 dark:text-emerald-400" :stroke-width="2" />
                <span>{{ activity.isDone ? 'Marquer à faire' : 'Marquer fait' }}</span>
              </button>
              <button @click="actionToggleBooked" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 text-sm">
                <BadgeCheck class="w-4 h-4 text-sky-600 dark:text-sky-400" :stroke-width="2" />
                <span>{{ activity.isBooked ? 'Marquer non réservé' : 'Marquer réservé' }}</span>
              </button>
              <button @click="actionDuplicate" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-3 text-sm">
                <Copy class="w-4 h-4 text-slate-500 dark:text-slate-400" :stroke-width="2" />
                <span>Dupliquer</span>
              </button>
              <div class="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
              <button @click="actionDelete" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-3 text-sm text-red-600 dark:text-red-400">
                <Trash2 class="w-4 h-4" :stroke-width="2" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </article>
</template>

<style scoped>
.actions-enter-active, .actions-leave-active { transition: opacity 0.2s ease; }
.actions-enter-from, .actions-leave-to { opacity: 0; }
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
