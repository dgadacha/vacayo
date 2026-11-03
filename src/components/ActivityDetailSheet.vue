<script setup>
import { computed, inject, ref, watch } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatPrice, formatDate, formatTime, nightsBetween } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { Check, Bookmark, Pencil, Copy, X, Sparkles, ChevronRight, Navigation, Globe } from 'lucide-vue-next'

// Apple Maps–style place card.
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
const hasPhoto = computed(() => item.value?.photoUrl && !imgFailed.value)

const when = computed(() => {
  const a = item.value
  if (!a?.date) return { label: 'Pas encore planifié', detail: '' }
  if (a.type === 'hotel' && a.endDate) {
    const n = nightsBetween(a.date, a.endDate)
    return {
      label: `${formatDate(a.date, 'EEE d MMM')} – ${formatDate(a.endDate, 'EEE d MMM')}`,
      detail: [formatTime(a.date) && `Arrivée ${formatTime(a.date)}`, formatTime(a.endDate) && `départ ${formatTime(a.endDate)}`, n && `${n} nuit${n > 1 ? 's' : ''}`].filter(Boolean).join(' · ')
    }
  }
  return { label: formatDate(a.date, 'EEEE d MMMM'), detail: formatTime(a.date) }
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
  const ok = await confirm({ title: `Supprimer « ${item.value.name} » ?`, message: 'Cette action est irréversible.', confirmLabel: 'Supprimer', destructive: true })
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
    teleport="body"
    :style="{ maxHeight: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }"
    @update:show="$emit('update:modelValue', $event)"
  >
    <div v-if="item" class="overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" :style="{ maxHeight: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }">
      <div v-if="hasPhoto" class="relative h-48">
        <img :src="item.photoUrl" :alt="item.name" class="absolute inset-0 w-full h-full object-cover" @error="imgFailed = true" />
        <div class="grabber absolute top-0 inset-x-0 !bg-white/70" />
      </div>
      <div v-else class="grabber" />

      <!-- Title block -->
      <div class="flex items-start gap-3 px-4 pt-3">
        <div class="flex-1 min-w-0">
          <h2 class="t-title2 [text-wrap:balance]">{{ item.name }}</h2>
          <p class="t-subhead text-muted mt-0.5">{{ [meta?.label, item.category, item.city].filter(Boolean).join(' · ') }}</p>
        </div>
        <button type="button" class="w-[30px] h-[30px] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background: var(--vc-surface-2); color: var(--vc-muted)" aria-label="Fermer" @click="close">
          <X class="w-4 h-4" :stroke-width="2.8" />
        </button>
      </div>

      <!-- Action buttons, like Maps (Itinéraire filled, others tinted) -->
      <div class="grid grid-cols-4 gap-2 px-4 mt-4">
        <button v-if="item.googleMapsUrl" type="button" class="qa qa-filled" @click="open(item.googleMapsUrl)">
          <Navigation class="w-[19px] h-[19px]" fill="currentColor" :stroke-width="1.5" /><span>Itinéraire</span>
        </button>
        <button v-if="canEdit" type="button" class="qa" :class="{ 'qa-on-green': item.isDone }" @click="toggleDone">
          <Check class="w-5 h-5" :stroke-width="2.6" /><span>{{ item.isDone ? 'Fait' : 'À faire' }}</span>
        </button>
        <button v-if="canEdit" type="button" class="qa" :class="{ 'qa-on': item.isBooked }" @click="toggleBooked">
          <Bookmark class="w-5 h-5" :fill="item.isBooked ? 'currentColor' : 'none'" :stroke-width="2.2" /><span>{{ item.isBooked ? 'Réservé' : 'Réserver' }}</span>
        </button>
        <button v-if="canEdit" type="button" class="qa" @click="edit">
          <Pencil class="w-5 h-5" :stroke-width="2.2" /><span>Modifier</span>
        </button>
        <button v-if="canEdit && !item.googleMapsUrl" type="button" class="qa" @click="duplicate">
          <Copy class="w-5 h-5" :stroke-width="2.2" /><span>Dupliquer</span>
        </button>
      </div>

      <!-- Details -->
      <h3 class="list-header mt-7">Détails</h3>
      <div class="list">
        <div class="row !block">
          <p class="t-subhead text-muted">{{ item.type === 'hotel' ? 'Séjour' : 'Quand' }}</p>
          <p class="t-body first-letter:uppercase" :class="{ 'text-muted': !item.date }">{{ when.label }}</p>
          <p v-if="when.detail" class="t-subhead text-muted">{{ when.detail }}</p>
        </div>
        <div class="row !block">
          <p class="t-subhead text-muted">Prix</p>
          <p class="t-body">{{ formatPrice(item.price, symbol) }}</p>
        </div>
        <div v-if="item.priority && item.priority !== 'normal'" class="row !block">
          <p class="t-subhead text-muted">Priorité</p>
          <p class="t-body">{{ priorityMeta.label }}</p>
        </div>
        <div v-if="item.notes" class="row !block">
          <p class="t-subhead text-muted">Notes</p>
          <p class="t-body whitespace-pre-line">{{ item.notes }}</p>
        </div>
      </div>

      <div v-if="item.bookingUrl || aiActions" class="list mt-7" style="--sep-inset: 57px">
        <button v-if="item.bookingUrl" type="button" class="row" @click="open(item.bookingUrl)">
          <span class="row-icon bg-[#007aff]"><Globe class="w-[17px] h-[17px]" :stroke-width="2" /></span>
          <span class="flex-1 t-body">Site de réservation</span>
          <ChevronRight class="w-4 h-4 text-subtle -mr-1" :stroke-width="2.5" />
        </button>
        <button v-if="aiActions" type="button" class="row" @click="askAi">
          <span class="row-icon" style="background: var(--vc-ai)"><Sparkles class="w-[17px] h-[17px]" :stroke-width="2" /></span>
          <span class="flex-1 t-body">Conseils de l’IA sur ce lieu</span>
          <ChevronRight class="w-4 h-4 text-subtle -mr-1" :stroke-width="2.5" />
        </button>
      </div>

      <div v-if="canEdit" class="list mt-7">
        <button type="button" class="row justify-center t-body" style="color: var(--vc-red)" @click="remove">Supprimer</button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.qa {
  @apply flex flex-col items-center justify-center gap-1 rounded-xl transition;
  height: 56px;
  font-size: 12px;
  font-weight: 500;
  background: var(--vc-surface);
  color: var(--vc-primary);
}
.qa:active { opacity: 0.5; }
.qa-filled { background: var(--vc-primary); color: #fff; }
.qa-on { background: var(--vc-primary-soft); }
.qa-on-green { background: rgb(52 199 89 / 0.15); color: var(--vc-green); }
</style>
