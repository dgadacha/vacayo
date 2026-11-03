<script setup>
import { computed, inject, ref, onBeforeUnmount } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatDate, formatTime, nightsBetween } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { Check, BadgeCheck, Moon, Trash2, CircleCheck, Bookmark, Flag, Star } from 'lucide-vue-next'

// One row of an iOS inset grouped list, with swipe actions (Mail-style).
const props = defineProps({
  activity: { type: Object, required: true }
})
const emit = defineEmits(['edit', 'view'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(true))
const symbol = computed(() => trip.value?.currencySymbol || '€')
const meta = computed(() => ACTIVITY_TYPES[props.activity.type] || ACTIVITY_TYPES.activity)
const toast = useToast()
const { confirm } = useConfirm()
const imgFailed = ref(false)
const swipe = ref(null)

const dateLabel = computed(() => {
  const a = props.activity
  if (!a.date) return ''
  if (a.type === 'hotel' && a.endDate) return `${formatDate(a.date, 'EEE d MMM')} – ${formatDate(a.endDate, 'EEE d MMM')}`
  const t = formatTime(a.date)
  return `${formatDate(a.date, 'EEE d MMM')}${t ? ' · ' + t : ''}`
})
const nights = computed(() => props.activity.type === 'hotel' ? nightsBetween(props.activity.date, props.activity.endDate) : 0)
const priceLabel = computed(() => {
  const n = Number(props.activity.price) || 0
  return n ? `${new Intl.NumberFormat('fr-FR').format(n)} ${symbol.value}` : ''
})
const subtitle = computed(() => [props.activity.category, props.activity.city].filter(Boolean).join(' · '))
const priority = computed(() => props.activity.priority)

function toggleDone() {
  activities.toggleDone(props.activity.id)
  swipe.value?.close()
}
function toggleBooked() {
  activities.toggleBooked(props.activity.id)
  swipe.value?.close()
}

async function remove() {
  swipe.value?.close()
  const ok = await confirm({ title: `Supprimer « ${props.activity.name} » ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })
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

// Long press (or right click) opens the actions sheet — the web stand-in for a context menu
const showActions = ref(false)
const pressed = ref(false)
let pressTimer = null
let longPressed = false

function startPress() {
  pressed.value = true
  if (!canEdit.value) return
  longPressed = false
  pressTimer = setTimeout(() => {
    longPressed = true
    pressed.value = false
    showActions.value = true
    if (navigator.vibrate) navigator.vibrate(20)
    window.dispatchEvent(new CustomEvent('vacayo:long-press'))
  }, 450)
}
function endPress() {
  pressed.value = false
  if (pressTimer) { clearTimeout(pressTimer); pressTimer = null }
}
function onContextMenu(e) {
  if (!canEdit.value) return
  e.preventDefault()
  showActions.value = true
}
onBeforeUnmount(endPress)

function onRowClick(e) {
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
    a.googleMapsUrl && { name: 'Ouvrir dans Plans', key: 'maps' },
    a.bookingUrl && { name: 'Ouvrir le lien de réservation', key: 'booking' },
    { name: 'Dupliquer', key: 'duplicate' },
    { name: 'Supprimer', key: 'delete', color: 'var(--vc-red)' }
  ].filter(Boolean)
})

async function onActionSelect(item) {
  showActions.value = false
  const a = props.activity
  switch (item.key) {
    case 'edit': emit('edit', a); break
    case 'done': toggleDone(); break
    case 'booked': toggleBooked(); break
    case 'maps': window.open(a.googleMapsUrl, '_blank', 'noopener'); break
    case 'booking': window.open(a.bookingUrl, '_blank', 'noopener'); break
    case 'duplicate': await duplicate(); break
    case 'delete': await remove(); break
  }
}
</script>

<template>
  <van-swipe-cell ref="swipe" :disabled="!canEdit" class="row-sep">
    <template #left>
      <button type="button" class="swipe-action bg-[#007aff]" @click="toggleBooked">
        <Bookmark class="w-5 h-5" :fill="activity.isBooked ? 'currentColor' : 'none'" :stroke-width="2" />
        <span>{{ activity.isBooked ? 'Annuler' : 'Réservé' }}</span>
      </button>
    </template>

    <div
      class="row no-tap-highlight select-none !items-start !py-2.5"
      :class="{ 'is-pressed': pressed }"
      role="button"
      tabindex="0"
      @click="onRowClick"
      @keydown.enter="emit('view', activity)"
      @touchstart.passive="startPress"
      @touchend.passive="endPress"
      @touchmove.passive="endPress"
      @touchcancel.passive="endPress"
      @contextmenu="onContextMenu"
    >
      <div class="w-[52px] h-[52px] rounded-[10px] overflow-hidden relative flex-shrink-0 bg-gradient-to-b" :class="meta.gradient">
        <img v-if="activity.photoUrl && !imgFailed" :src="activity.photoUrl" :alt="activity.name" class="absolute inset-0 w-full h-full object-cover" loading="lazy" @error="imgFailed = true" />
        <div v-else class="absolute inset-0 flex items-center justify-center text-white">
          <component :is="meta.icon" class="w-6 h-6" :stroke-width="1.9" />
        </div>
      </div>

      <div class="flex-1 min-w-0" :class="{ 'opacity-50': activity.isDone }">
        <div class="flex items-baseline gap-2">
          <p class="flex-1 t-body font-medium leading-snug line-clamp-2" :class="{ 'line-through': activity.isDone }">{{ activity.name }}</p>
          <span v-if="priceLabel" class="t-subhead text-muted whitespace-nowrap">{{ priceLabel }}</span>
        </div>
        <p v-if="subtitle" class="t-subhead text-muted truncate">{{ subtitle }}</p>
        <p class="t-footnote flex items-center gap-1.5 mt-0.5 flex-wrap" :class="dateLabel ? 'text-muted' : 'text-subtle'">
          <span class="first-letter:uppercase">{{ dateLabel || 'Sans date' }}</span>
          <span v-if="nights" class="flex items-center gap-0.5"><Moon class="w-3 h-3" :stroke-width="2.2" />{{ nights }}</span>
          <span v-if="activity.isBooked" class="flex items-center gap-0.5 font-medium" style="color: var(--vc-green)"><BadgeCheck class="w-3.5 h-3.5" :stroke-width="2.2" />Réservé</span>
          <span v-if="priority === 'must-do'" class="flex items-center gap-0.5 font-medium" style="color: var(--vc-red)"><Flag class="w-3 h-3" fill="currentColor" :stroke-width="2" />À ne pas rater</span>
          <span v-else-if="priority === 'high'" class="flex items-center gap-0.5 font-medium" style="color: var(--vc-orange)"><Star class="w-3 h-3" fill="currentColor" :stroke-width="2" />Important</span>
        </p>
      </div>

      <button
        v-if="canEdit"
        type="button"
        class="w-[26px] h-[26px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 transition"
        :style="activity.isDone ? { background: 'var(--vc-green)', color: '#fff' } : { boxShadow: 'inset 0 0 0 1.5px var(--vc-subtle)', color: 'transparent' }"
        :aria-label="activity.isDone ? 'Marquer à faire' : 'Marquer comme fait'"
        :aria-pressed="activity.isDone"
        @click.stop="toggleDone"
      >
        <Check class="w-4 h-4" :stroke-width="3" />
      </button>
    </div>

    <template #right>
      <div class="flex h-full">
        <button type="button" class="swipe-action bg-[#34c759]" @click="toggleDone">
          <CircleCheck class="w-5 h-5" :stroke-width="2" />
          <span>{{ activity.isDone ? 'À faire' : 'Fait' }}</span>
        </button>
        <button type="button" class="swipe-action bg-[#ff3b30]" @click="remove">
          <Trash2 class="w-5 h-5" :stroke-width="2" />
          <span>Supprimer</span>
        </button>
      </div>
    </template>

    <!-- Teleported, so keeping it here leaves the row with a single root -->
    <van-action-sheet
      v-model:show="showActions"
      :title="activity.name"
      teleport="body"
      cancel-text="Annuler"
      close-on-click-action
      :actions="actionSheetItems"
      @select="onActionSelect"
    />
  </van-swipe-cell>
</template>

<style scoped>
.swipe-action {
  @apply h-full flex flex-col items-center justify-center gap-1 text-white;
  width: 78px;
  font-size: 13px;
  font-weight: 500;
}
.swipe-action:active { filter: brightness(0.9); }
</style>
