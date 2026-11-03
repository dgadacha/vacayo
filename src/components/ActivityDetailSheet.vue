<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatPrice, formatDate, formatTime, colorFromString, nightsBetween } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { Check, BadgeCheck, Pencil, Copy, Trash2, CalendarDays, MapPin, Wallet, ExternalLink, Navigation, Sparkles, X, StickyNote } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  activity: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'edit'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(false))
const aiActions = inject('aiActions', null)
const symbol = computed(() => trip.value?.currencySymbol || '€')
const toast = useToast()
const { confirm } = useConfirm()
const imgFailed = ref(false)

// Follow live updates (toggles) instead of the snapshot we were opened with
const item = computed(() => props.activity && (activities.all.find(a => a.id === props.activity.id) || props.activity))
watch(() => props.activity?.id, () => { imgFailed.value = false })

const meta = computed(() => item.value ? (ACTIVITY_TYPES[item.value.type] || ACTIVITY_TYPES.activity) : null)
const priorityMeta = computed(() => item.value ? (PRIORITY_OPTIONS.find(p => p.value === item.value.priority) || PRIORITY_OPTIONS[2]) : null)
const placeholderGradient = computed(() => colorFromString(item.value?.name || ''))

const dateLabel = computed(() => {
  const a = item.value
  if (!a?.date) return ''
  if (a.type === 'hotel' && a.endDate) {
    const n = nightsBetween(a.date, a.endDate)
    return `${formatDate(a.date, 'EEEE d MMM')} → ${formatDate(a.endDate, 'EEEE d MMM')}${n ? ` · ${n} nuit${n > 1 ? 's' : ''}` : ''}`
  }
  const t = formatTime(a.date)
  return `${formatDate(a.date, 'EEEE d MMMM')}${t ? ' à ' + t : ''}`
})

function close() { emit('update:modelValue', false) }
function open(url) { url && window.open(url, '_blank', 'noopener') }
function toggleDone() { if (item.value) activities.toggleDone(item.value.id) }
function toggleBooked() { if (item.value) activities.toggleBooked(item.value.id) }

async function duplicate() {
  try {
    const a = item.value
    await activities.addActivity({ ...a, name: a.name + ' (copie)', isDone: false })
    toast.success('Dupliqué')
  } catch (e) { toast.error(e.message || 'Erreur') }
}

async function remove() {
  const ok = await confirm({ title: `Supprimer « ${item.value.name} » ?`, confirmLabel: 'Supprimer', destructive: true })
  if (!ok) return
  try {
    await activities.deleteActivity(item.value.id)
    toast.success('Supprimé')
    close()
  } catch (e) { toast.error(e.message || 'Erreur') }
}

function edit() {
  emit('edit', item.value)
  close()
}

function askAi() {
  close()
  aiActions?.openChat(`Donne-moi tes meilleurs conseils pour « ${item.value.name} »${item.value.city ? ` (${item.value.city})` : ''} : quand y aller, combien de temps prévoir, à ne pas manquer, et quoi faire à proximité dans mon voyage.`)
}
</script>

<template>
  <van-popup
    :show="modelValue"
    position="bottom"
    round
    safe-area-inset-bottom
    teleport="body"
    :style="{ maxHeight: '92vh' }"
    @update:show="$emit('update:modelValue', $event)"
  >
    <div v-if="item" class="overflow-y-auto" :style="{ maxHeight: '92vh' }">
      <div class="relative h-56 bg-gradient-to-br" :class="placeholderGradient">
        <img v-if="item.photoUrl && !imgFailed" :src="item.photoUrl" :alt="item.name" class="absolute inset-0 w-full h-full object-cover" @error="imgFailed = true" />
        <div v-else class="absolute inset-x-0 top-0 h-28 flex items-center justify-center text-white/80">
          <component :is="meta?.iconBig" class="w-14 h-14" :stroke-width="1.25" />
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <button type="button" class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center" aria-label="Fermer" @click="close">
          <X class="w-5 h-5" :stroke-width="2" />
        </button>
        <div class="absolute bottom-0 inset-x-0 p-5 text-white">
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span class="chip bg-white/20 text-white ring-white/30 backdrop-blur"><component :is="meta?.icon" class="w-3 h-3" :stroke-width="2" />{{ meta?.label }}</span>
            <span v-if="item.priority && item.priority !== 'normal'" class="chip bg-white/20 text-white ring-white/30 backdrop-blur"><component :is="priorityMeta.icon" class="w-3 h-3" :stroke-width="2" />{{ priorityMeta.label }}</span>
            <span v-if="item.isBooked" class="chip bg-emerald-500/90 text-white ring-emerald-400"><BadgeCheck class="w-3 h-3" :stroke-width="2" />Réservé</span>
          </div>
          <h2 class="text-2xl font-extrabold leading-tight tracking-tight">{{ item.name }}</h2>
          <p v-if="item.category" class="text-sm text-white/80 mt-0.5">{{ item.category }}</p>
        </div>
      </div>

      <div v-if="canEdit" class="grid grid-cols-4 gap-2 px-4 pt-4">
        <button type="button" class="qa" :class="{ 'qa-on': item.isDone }" @click="toggleDone">
          <Check class="w-5 h-5" :stroke-width="2.25" /><span>{{ item.isDone ? 'Fait' : 'À faire' }}</span>
        </button>
        <button type="button" class="qa" :class="{ 'qa-on': item.isBooked }" @click="toggleBooked">
          <BadgeCheck class="w-5 h-5" :stroke-width="2" /><span>{{ item.isBooked ? 'Réservé' : 'Réserver' }}</span>
        </button>
        <button type="button" class="qa" @click="edit"><Pencil class="w-5 h-5" :stroke-width="2" /><span>Modifier</span></button>
        <button type="button" class="qa" @click="duplicate"><Copy class="w-5 h-5" :stroke-width="2" /><span>Dupliquer</span></button>
      </div>

      <div class="px-4 pt-4 space-y-3">
        <div class="card divide-y" style="--tw-divide-opacity: 1">
          <div v-if="dateLabel" class="info"><CalendarDays class="info-icon" :stroke-width="2" /><span class="capitalize-first">{{ dateLabel }}</span></div>
          <div v-else class="info text-subtle italic"><CalendarDays class="info-icon" :stroke-width="2" />Pas encore planifié</div>
          <div v-if="item.city" class="info"><MapPin class="info-icon" :stroke-width="2" />{{ item.city }}</div>
          <div class="info"><Wallet class="info-icon" :stroke-width="2" />{{ formatPrice(item.price, symbol) }}</div>
        </div>

        <div v-if="item.notes" class="card p-4">
          <p class="section-label flex items-center gap-1.5 mb-2"><StickyNote class="w-3.5 h-3.5" :stroke-width="2" />Notes</p>
          <p class="whitespace-pre-line leading-relaxed text-sm">{{ item.notes }}</p>
        </div>

        <div v-if="item.googleMapsUrl || item.bookingUrl" class="grid gap-2" :class="item.googleMapsUrl && item.bookingUrl ? 'grid-cols-2' : 'grid-cols-1'">
          <button v-if="item.googleMapsUrl" type="button" class="btn btn-secondary" @click="open(item.googleMapsUrl)"><Navigation class="w-4 h-4" :stroke-width="2" />Itinéraire</button>
          <button v-if="item.bookingUrl" type="button" class="btn btn-secondary" @click="open(item.bookingUrl)"><ExternalLink class="w-4 h-4" :stroke-width="2" />Réservation</button>
        </div>

        <button v-if="aiActions" type="button" class="btn w-full" style="background: var(--vc-primary-soft); color: var(--vc-primary)" @click="askAi">
          <Sparkles class="w-4 h-4" :stroke-width="2" />Conseils de l'IA sur ce lieu
        </button>
      </div>

      <div v-if="canEdit" class="px-4 pt-2 pb-6 safe-bottom">
        <button type="button" class="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400" @click="remove">
          <Trash2 class="w-4 h-4" :stroke-width="2" />Supprimer
        </button>
      </div>
      <div v-else class="h-6" />
    </div>
  </van-popup>
</template>

<style scoped>
.qa {
  @apply flex flex-col items-center justify-center gap-1 h-16 rounded-2xl text-[11px] font-semibold transition;
  background: var(--vc-surface-2);
  color: var(--vc-muted);
}
.qa:active { transform: scale(0.96); }
.qa-on { background: var(--vc-primary-soft); color: var(--vc-primary); }
.info { @apply flex items-center gap-3 px-4 py-3 text-sm; border-color: var(--vc-border-soft); }
.info-icon { @apply w-4 h-4 flex-shrink-0; color: var(--vc-subtle); }
.capitalize-first::first-letter { text-transform: uppercase; }
</style>
