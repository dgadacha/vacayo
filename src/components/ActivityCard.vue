<script setup>
import { computed, inject, ref, onBeforeUnmount } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatPrice, formatDate, formatTime, colorFromString } from '@/utils/helpers'
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

function onCardClick(e) {
  if (longPressed) { longPressed = false; return }
  if (e.target.closest('.van-tag, button, a, .action-btn')) return
  emit('view', props.activity)
}

const actionSheetItems = computed(() => [
  { name: 'Modifier', key: 'edit' },
  { name: props.activity.isDone ? 'Marquer à faire' : 'Marquer fait', key: 'done' },
  { name: props.activity.isBooked ? 'Marquer non réservé' : 'Marquer réservé', key: 'booked' },
  { name: 'Dupliquer', key: 'duplicate' },
  { name: 'Supprimer', key: 'delete', color: '#ee0a24' }
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

const priorityTagType = computed(() => ({
  'must-do': 'danger',
  'high': 'warning',
  'normal': 'default'
}[props.activity.priority] || 'default'))
</script>

<template>
  <van-card
    :title="activity.name"
    :desc="activity.category || ''"
    :price="activity.price > 0 ? activity.price : ''"
    :currency="activity.price > 0 ? symbol : ''"
    :origin-price="''"
    class="no-tap-highlight !cursor-pointer"
    :class="{ '!opacity-60': activity.isDone }"
    @click="onCardClick"
    @touchstart.passive="startPress"
    @touchend.passive="endPress"
    @touchmove.passive="endPress"
    @touchcancel.passive="endPress"
    @contextmenu="onContextMenu"
  >
    <template #thumb>
      <div class="w-full h-full relative">
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
      </div>
    </template>

    <template #tags>
      <van-tag v-if="activity.priority !== 'normal'" :type="priorityTagType" plain size="mini" style="margin-right: 4px; margin-top: 4px;">
        {{ priorityMeta.label }}
      </van-tag>
      <van-tag v-if="activity.isBooked" type="success" size="mini" style="margin-top: 4px;">
        ✓ Réservé
      </van-tag>
    </template>

    <template #bottom>
      <div v-if="dateLabel || activity.city" class="text-xs opacity-70 mt-1">
        <span v-if="activity.city">{{ activity.city }}</span>
        <span v-if="dateLabel && activity.city"> · </span>
        <span v-if="dateLabel">{{ dateLabel }}</span>
      </div>
    </template>

    <template v-if="!compact" #footer>
      <div class="flex gap-1.5 -mt-1">
        <van-button v-if="activity.googleMapsUrl" size="mini" icon="location-o" plain hairline @click.stop="openMaps" class="action-btn" />
        <van-button v-if="activity.bookingUrl" size="mini" icon="link-o" plain hairline @click.stop="openBooking" class="action-btn" />
        <div class="flex-1" />
        <van-button v-if="canEdit" size="mini" :icon="activity.isDone ? 'success' : 'passed'" :type="activity.isDone ? 'success' : 'default'" plain hairline @click.stop="toggleDone" class="action-btn" />
        <van-button v-if="canEdit" size="mini" icon="edit" plain hairline @click.stop="$emit('edit', activity)" class="action-btn" />
        <van-button v-if="canEdit" size="mini" icon="ellipsis" plain hairline @click.stop="showActions = true" class="action-btn" />
      </div>
    </template>
  </van-card>

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
</template>
