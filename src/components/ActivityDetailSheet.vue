<script setup>
import { computed, inject, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatPrice, formatDate, formatTime, colorFromString } from '@/utils/helpers'
import {
  X, Check, MapPin, ExternalLink, Pencil, Trash2, BadgeCheck, Copy,
  Calendar, Tag, FileText, Receipt
} from 'lucide-vue-next'
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
  >
    <div v-if="activity" class="overflow-y-auto bg-white dark:bg-slate-900" :style="{ maxHeight: '92vh' }">
          <!-- Photo / hero -->
          <div class="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden rounded-t-3xl">
            <img v-if="activity.photoUrl" :src="activity.photoUrl" :alt="activity.name" class="absolute inset-0 w-full h-full object-cover" @error="$event.target.style.display='none'" />
            <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br text-white" :class="placeholderGradient">
              <component :is="meta?.iconBig" class="w-16 h-16" :stroke-width="1.25" />
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/30" />
            <button @click="close" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60" aria-label="Fermer">
              <X class="w-5 h-5" :stroke-width="2" />
            </button>
            <div class="absolute top-3 left-3 flex gap-1.5 flex-wrap">
              <span class="chip bg-white/95 text-slate-700 ring-white/0">
                <component :is="meta?.icon" class="w-3 h-3" :stroke-width="2" />
                {{ meta?.label }}
              </span>
              <span v-if="activity.priority !== 'normal'" class="chip" :class="priorityMeta?.color">
                <span class="w-1.5 h-1.5 rounded-full" :class="priorityMeta?.dot" />
                {{ priorityMeta?.label }}
              </span>
            </div>
            <div class="absolute bottom-3 left-4 right-4 text-white">
              <h2 class="text-xl font-bold tracking-tight leading-tight drop-shadow">{{ activity.name }}</h2>
              <p v-if="activity.category" class="text-sm text-white/85 mt-0.5">{{ activity.category }}</p>
            </div>
          </div>

          <!-- Quick actions row -->
          <div v-if="canEdit" class="flex border-b border-slate-100 dark:border-slate-800">
            <button @click="toggleDone" class="flex-1 py-3 flex flex-col items-center gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Check class="w-5 h-5" :class="activity.isDone ? 'text-emerald-600' : 'text-slate-400'" :stroke-width="2.25" />
              <span class="text-[10px] font-semibold tracking-tight" :class="activity.isDone ? 'text-emerald-600' : 'text-slate-500 dark:text-slate-400'">{{ activity.isDone ? 'Fait' : 'À faire' }}</span>
            </button>
            <div class="w-px bg-slate-100 dark:bg-slate-800" />
            <button @click="toggleBooked" class="flex-1 py-3 flex flex-col items-center gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <BadgeCheck class="w-5 h-5" :class="activity.isBooked ? 'text-sky-600' : 'text-slate-400'" :stroke-width="2.25" />
              <span class="text-[10px] font-semibold tracking-tight" :class="activity.isBooked ? 'text-sky-600' : 'text-slate-500 dark:text-slate-400'">{{ activity.isBooked ? 'Réservé' : 'Réserver' }}</span>
            </button>
            <div class="w-px bg-slate-100 dark:bg-slate-800" />
            <button @click="edit" class="flex-1 py-3 flex flex-col items-center gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Pencil class="w-5 h-5 text-slate-500 dark:text-slate-400" :stroke-width="2.25" />
              <span class="text-[10px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">Modifier</span>
            </button>
            <div class="w-px bg-slate-100 dark:bg-slate-800" />
            <button @click="duplicate" class="flex-1 py-3 flex flex-col items-center gap-0.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              <Copy class="w-5 h-5 text-slate-500 dark:text-slate-400" :stroke-width="2.25" />
              <span class="text-[10px] font-semibold tracking-tight text-slate-500 dark:text-slate-400">Dupliquer</span>
            </button>
          </div>

          <!-- Details -->
          <div class="p-5 space-y-3 text-sm">
            <div v-if="dateLabel" class="flex items-start gap-3">
              <Calendar class="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" :stroke-width="2" />
              <p class="capitalize">{{ dateLabel }}</p>
            </div>
            <div v-if="activity.city" class="flex items-start gap-3">
              <MapPin class="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" :stroke-width="2" />
              <p>{{ activity.city }}</p>
            </div>
            <div v-if="activity.price > 0" class="flex items-start gap-3">
              <Receipt class="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" :stroke-width="2" />
              <p class="font-semibold">{{ formatPrice(activity.price, symbol) }}</p>
            </div>
            <div v-if="activity.category" class="flex items-start gap-3">
              <Tag class="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" :stroke-width="2" />
              <p>{{ activity.category }}</p>
            </div>
            <div v-if="activity.notes" class="flex items-start gap-3">
              <FileText class="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" :stroke-width="2" />
              <p class="whitespace-pre-line text-slate-700 dark:text-slate-200 leading-relaxed">{{ activity.notes }}</p>
            </div>
          </div>

          <!-- Links -->
          <div v-if="activity.googleMapsUrl || activity.bookingUrl" class="px-5 pb-3 space-y-2">
            <button v-if="activity.googleMapsUrl" @click="openMaps" class="w-full rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition px-3 py-3 flex items-center gap-3 text-left">
              <MapPin class="w-4 h-4 text-slate-500 dark:text-slate-400" :stroke-width="2" />
              <span class="flex-1 text-sm font-medium">Ouvrir dans Google Maps</span>
              <ExternalLink class="w-4 h-4 text-slate-400" :stroke-width="2" />
            </button>
            <button v-if="activity.bookingUrl" @click="openBooking" class="w-full rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition px-3 py-3 flex items-center gap-3 text-left">
              <ExternalLink class="w-4 h-4 text-slate-500 dark:text-slate-400" :stroke-width="2" />
              <span class="flex-1 text-sm font-medium truncate">{{ activity.bookingUrl }}</span>
            </button>
          </div>

          <!-- Delete -->
          <div v-if="canEdit" class="px-5 pb-6 safe-bottom">
            <button @click="remove" class="w-full text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl py-2.5 flex items-center justify-center gap-2 transition">
              <Trash2 class="w-4 h-4" :stroke-width="2" />
              Supprimer
            </button>
          </div>
    </div>
  </van-popup>
</template>
