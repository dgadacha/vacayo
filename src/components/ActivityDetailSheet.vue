<script setup>
import { computed, inject, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatPrice, formatDate, formatTime, colorFromString } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const props = defineProps({
  modelValue: Boolean,
  activity: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'edit'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(false))
const symbol = computed(() => trip.value?.currencySymbol || '€')
const toast = useToast()
const { confirm } = useConfirm()

const meta = computed(() => props.activity ? (ACTIVITY_TYPES[props.activity.type] || ACTIVITY_TYPES.activity) : null)
const priorityMeta = computed(() => props.activity
  ? (PRIORITY_OPTIONS.find(p => p.value === props.activity.priority) || PRIORITY_OPTIONS[2])
  : null)
const placeholderGradient = computed(() => colorFromString(props.activity?.name || ''))

const dateLabel = computed(() => {
  const a = props.activity
  if (!a?.date) return ''
  if (a.type === 'hotel' && a.endDate) {
    const days = Math.round((new Date(a.endDate) - new Date(a.date)) / 86400000)
    const nights = days > 0 ? ` · ${days} nuit${days > 1 ? 's' : ''}` : ''
    return `${formatDate(a.date, 'EEEE d MMM')} → ${formatDate(a.endDate, 'EEEE d MMM')}${nights}`
  }
  const t = formatTime(a.date)
  return `${formatDate(a.date, 'EEEE d MMMM')}${t ? ' · ' + t : ''}`
})

function close() { emit('update:modelValue', false) }
function openMaps() { props.activity.googleMapsUrl && window.open(props.activity.googleMapsUrl, '_blank', 'noopener') }
function openBooking() { props.activity.bookingUrl && window.open(props.activity.bookingUrl, '_blank', 'noopener') }
function toggleDone() { if (props.activity) activities.toggleDone(props.activity.id) }
function toggleBooked() { if (props.activity) activities.toggleBooked(props.activity.id) }

async function duplicate() {
  try {
    const a = props.activity
    await activities.addActivity({ ...a, name: a.name + ' (copie)', isDone: false })
    toast.success('Dupliqué')
  } catch (e) { toast.error(e.message || 'Erreur') }
}

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
    close()
  } catch (e) { toast.error(e.message || 'Erreur') }
}

function edit() {
  emit('edit', props.activity)
  close()
}

const priorityTagType = computed(() => ({
  'must-do': 'danger', 'high': 'warning', 'normal': 'default'
}[props.activity?.priority] || 'default'))
</script>

<template>
  <van-popup
    :show="modelValue"
    @update:show="$emit('update:modelValue', $event)"
    position="bottom"
    round
    safe-area-inset-bottom
    teleport="body"
    :style="{ maxHeight: '92vh' }"
    closeable
  >
    <div v-if="activity" class="overflow-y-auto" :style="{ maxHeight: '92vh' }">
      <!-- Photo / hero -->
      <div class="relative" style="aspect-ratio: 16/10; overflow: hidden;">
        <img v-if="activity.photoUrl" :src="activity.photoUrl" :alt="activity.name" class="absolute inset-0 w-full h-full object-cover" @error="$event.target.style.display='none'" />
        <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br text-white" :class="placeholderGradient">
          <component :is="meta?.iconBig" class="w-16 h-16" :stroke-width="1.25" />
        </div>
      </div>

      <div class="p-4">
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="min-w-0">
            <h2 class="text-lg font-bold leading-tight">{{ activity.name }}</h2>
            <p v-if="activity.category" class="text-sm opacity-70 mt-0.5">{{ activity.category }}</p>
          </div>
          <div class="flex flex-col gap-1 items-end flex-shrink-0">
            <van-tag plain size="small">{{ meta?.label }}</van-tag>
            <van-tag v-if="activity.priority !== 'normal'" :type="priorityTagType" plain size="small">
              {{ priorityMeta?.label }}
            </van-tag>
            <van-tag v-if="activity.isBooked" type="success" size="small">✓ Réservé</van-tag>
          </div>
        </div>
      </div>

      <!-- Quick actions -->
      <van-grid v-if="canEdit" :column-num="4" :border="false">
        <van-grid-item :icon="activity.isDone ? 'success' : 'passed'" :text="activity.isDone ? 'Fait' : 'À faire'" @click="toggleDone" />
        <van-grid-item :icon="activity.isBooked ? 'checked' : 'passed'" :text="activity.isBooked ? 'Réservé' : 'Réserver'" @click="toggleBooked" />
        <van-grid-item icon="edit" text="Modifier" @click="edit" />
        <van-grid-item icon="records" text="Dupliquer" @click="duplicate" />
      </van-grid>

      <!-- Details cell-group -->
      <van-cell-group inset title="Détails" style="margin-top: 12px;">
        <van-cell v-if="dateLabel" title="Date" :label="dateLabel" icon="calendar-o" class="capitalize" />
        <van-cell v-if="activity.city" title="Ville" :label="activity.city" icon="location-o" />
        <van-cell v-if="activity.price > 0" title="Prix" :label="formatPrice(activity.price, symbol)" icon="balance-o" />
      </van-cell-group>

      <van-cell-group v-if="activity.notes" inset title="Notes" style="margin-top: 12px;">
        <van-cell>
          <template #title>
            <p class="whitespace-pre-line leading-relaxed text-sm">{{ activity.notes }}</p>
          </template>
        </van-cell>
      </van-cell-group>

      <van-cell-group v-if="activity.googleMapsUrl || activity.bookingUrl" inset title="Liens" style="margin-top: 12px;">
        <van-cell v-if="activity.googleMapsUrl" title="Google Maps" icon="location-o" is-link @click="openMaps" />
        <van-cell v-if="activity.bookingUrl" title="Site / Booking" icon="link-o" is-link @click="openBooking" />
      </van-cell-group>

      <div v-if="canEdit" class="px-4 mt-4 mb-6 safe-bottom">
        <van-button type="danger" plain block round icon="delete-o" @click="remove">Supprimer</van-button>
      </div>
    </div>
  </van-popup>
</template>
