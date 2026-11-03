<script setup>
import { ref, reactive, computed, inject, watch } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { generateTrip, aiErrorMessage, TRIP_MAX_DAYS } from '@/services/ai'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { formatDate, formatTime, nightsBetween } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import AiSheetHeader from './AiSheetHeader.vue'
import { Sparkles, Check, MapPin, RefreshCw } from 'lucide-vue-next'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const activities = useActivitiesStore()
const trip = inject('trip')
const canEdit = inject('canEdit')
const openTripEditor = inject('openTripEditor', null)
const toast = useToast()

const step = ref('prefs') // prefs | working | review
const prefs = reactive({ pace: 'balanced', interests: [], lodging: 'comfort', notes: '' })
const found = ref(0)
const result = ref(null)
const selected = ref(new Set())
const error = ref('')
const saving = ref(false)
let abort = null

const PACES = [{ value: 'calm', label: 'Tranquille' }, { value: 'balanced', label: 'Équilibré' }, { value: 'intense', label: 'Intense' }]
const LODGINGS = [{ value: 'budget', label: 'Économique' }, { value: 'comfort', label: 'Confort' }, { value: 'luxury', label: 'Luxe' }]
const INTERESTS = ['Incontournables', 'Culture', 'Gastronomie', 'Nature', 'Shopping', 'Vie nocturne', 'Hors des sentiers battus', 'En famille']

const destination = computed(() => [trip.value?.destination, trip.value?.country].filter(Boolean).join(', '))
const nights = computed(() => nightsBetween(trip.value?.startDate, trip.value?.endDate))
const days = computed(() => (trip.value?.startDate && trip.value?.endDate) ? nights.value + 1 : 0)
const missing = computed(() => !destination.value || !trip.value?.startDate || !trip.value?.endDate)
const tooLong = computed(() => days.value > TRIP_MAX_DAYS)
const hasHotels = computed(() => activities.all.some(a => a.type === 'hotel'))
const symbol = computed(() => trip.value?.currencySymbol || '€')

const hotels = computed(() => (result.value?.items || []).map((it, i) => ({ ...it, i })).filter(it => it.type === 'hotel'))
const byDay = computed(() => {
  const map = new Map()
  ;(result.value?.items || []).forEach((it, i) => {
    if (it.type === 'hotel') return
    const d = it.date.slice(0, 10)
    if (!map.has(d)) map.set(d, [])
    map.get(d).push({ ...it, i })
  })
  return [...map.entries()].map(([date, list]) => ({ date, city: cityOn(date), list }))
})
const selectedCount = computed(() => selected.value.size)
const selectedTotal = computed(() => (result.value?.items || []).reduce((s, it, i) => s + (selected.value.has(i) ? it.price : 0), 0))

function cityOn(date) {
  return result.value?.stages?.find(s => date >= s.from && date < s.to)?.city
    || result.value?.stages?.find(s => date >= s.from && date <= s.to)?.city || ''
}

watch(() => props.modelValue, (open) => {
  if (open) { error.value = ''; if (step.value === 'working') step.value = 'prefs' }
  else abort?.abort()
})

function toggleInterest(x) {
  const i = prefs.interests.indexOf(x)
  i === -1 ? prefs.interests.push(x) : prefs.interests.splice(i, 1)
}
function toggle(i) {
  const s = new Set(selected.value)
  s.has(i) ? s.delete(i) : s.add(i)
  selected.value = s
}

async function run() {
  if (missing.value || tooLong.value) return
  error.value = ''
  found.value = 0
  step.value = 'working'
  abort = new AbortController()
  try {
    result.value = await generateTrip({
      trip: trip.value,
      items: activities.all,
      prefs: { ...prefs, interests: [...prefs.interests] },
      onProgress: (n) => { found.value = n },
      signal: abort.signal
    })
    selected.value = new Set(result.value.items.map((_, i) => i))
    step.value = 'review'
  } catch (e) {
    const msg = aiErrorMessage(e)
    step.value = 'prefs'
    if (msg) error.value = msg
  } finally {
    abort = null
  }
}

function cancel() { abort?.abort() }

async function addSelected() {
  if (!selectedCount.value || saving.value) return
  saving.value = true
  try {
    const chosen = result.value.items.filter((_, i) => selected.value.has(i))
    for (let k = 0; k < chosen.length; k += 10) {
      await Promise.all(chosen.slice(k, k + 10).map(it => activities.addActivity(it)))
    }
    toast.success(`${chosen.length} éléments ajoutés au voyage`)
    emit('update:modelValue', false)
    step.value = 'prefs'
    result.value = null
  } catch (e) {
    toast.error(e.message || "Erreur lors de l'ajout")
  } finally {
    saving.value = false
  }
}

function editTrip() {
  emit('update:modelValue', false)
  openTripEditor?.()
}
function close() { emit('update:modelValue', false) }
</script>

<template>
  <van-popup :show="modelValue" position="bottom" round teleport="body" :style="{ height: '94vh', background: 'var(--vc-bg)' }" @update:show="emit('update:modelValue', $event)">
    <div class="h-full flex flex-col">
      <AiSheetHeader title="Générer le voyage" :subtitle="destination || 'Avec Claude Haiku'" @close="close" />

      <!-- 1. Preferences -->
      <div v-if="step === 'prefs'" class="flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <div class="list mt-2">
          <div class="row !block !py-3">
            <p class="t-title3">{{ destination || 'Destination à définir' }}</p>
            <p v-if="days" class="t-subhead text-muted first-letter:uppercase">{{ formatDate(trip.startDate, 'EEE d MMM') }} – {{ formatDate(trip.endDate, 'EEE d MMM yyyy') }} · {{ days }} jours, {{ nights }} nuits</p>
            <p v-else class="t-subhead text-muted">Dates à définir</p>
          </div>
          <button v-if="missing && canEdit" type="button" class="row t-body text-tint" @click="editTrip">Compléter la destination et les dates</button>
        </div>
        <p v-if="missing" class="list-footer">L’IA a besoin de la destination et des dates d’arrivée et de départ.</p>
        <p v-else-if="tooLong" class="list-footer" style="color: var(--vc-red)">Le générateur gère jusqu’à {{ TRIP_MAX_DAYS }} jours.</p>
        <p v-else-if="hasHotels" class="list-footer">Tes hôtels déjà prévus sont conservés ; l’IA complète autour.</p>

        <h3 class="list-header mt-7">Rythme</h3>
        <div class="px-4">
          <div class="segmented">
            <button v-for="p in PACES" :key="p.value" type="button" :aria-pressed="prefs.pace === p.value" @click="prefs.pace = p.value">{{ p.label }}</button>
          </div>
        </div>

        <h3 class="list-header mt-7">Envies</h3>
        <div class="px-4 flex flex-wrap gap-2">
          <button v-for="x in INTERESTS" :key="x" type="button" class="pill" :aria-pressed="prefs.interests.includes(x)" @click="toggleInterest(x)">{{ x }}</button>
        </div>

        <template v-if="!hasHotels">
          <h3 class="list-header mt-7">Hébergement</h3>
          <div class="px-4">
            <div class="segmented">
              <button v-for="l in LODGINGS" :key="l.value" type="button" :aria-pressed="prefs.lodging === l.value" @click="prefs.lodging = l.value">{{ l.label }}</button>
            </div>
          </div>
        </template>

        <h3 class="list-header mt-7">Précisions</h3>
        <div class="list">
          <textarea v-model="prefs.notes" rows="3" class="w-full bg-transparent outline-none resize-none px-4 py-3 text-[17px] leading-[22px]" placeholder="Ex. arrivée le soir, végétarien, une journée au calme…" aria-label="Précisions" />
        </div>

        <p v-if="error" role="alert" class="list-footer" style="color: var(--vc-red)">{{ error }}</p>

        <div class="px-4 mt-8">
          <button type="button" class="btn btn-ai w-full" :disabled="missing || tooLong" @click="run">
            <Sparkles class="w-5 h-5" :stroke-width="2.2" />Générer le voyage
          </button>
          <p class="t-footnote text-muted text-center mt-3">Tu pourras tout revoir et décocher avant d’ajouter.</p>
        </div>
      </div>

      <!-- 2. Working -->
      <div v-else-if="step === 'working'" class="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div class="ai-glow rounded-[26px]">
          <div class="w-24 h-24 rounded-[24px] flex items-center justify-center text-white" style="background: var(--vc-ai)">
            <Sparkles class="w-12 h-12 animate-pulse" :stroke-width="1.6" />
          </div>
        </div>
        <p class="t-title3 mt-7">Création de ton voyage</p>
        <p class="t-subhead text-muted mt-1">{{ found ? `${found} lieu${found > 1 ? 'x' : ''} trouvé${found > 1 ? 's' : ''}` : 'Haiku réfléchit à l’itinéraire…' }}</p>
        <p class="t-footnote text-subtle mt-3">Environ 30 secondes pour une semaine.</p>
        <button type="button" class="btn btn-plain mt-6" @click="cancel">Annuler</button>
      </div>

      <!-- 3. Review -->
      <template v-else-if="result">
        <div class="flex-1 overflow-y-auto pb-4">
          <p class="t-subhead px-4 pt-2 leading-relaxed">{{ result.summary }}</p>
          <div v-if="result.stages.length" data-no-swipe class="flex gap-2 overflow-x-auto scrollbar-hide px-4 mt-3">
            <span v-for="s in result.stages" :key="s.city + s.from" class="chip surface !text-[13px] !py-1 !px-3 !font-medium flex-shrink-0">
              <MapPin class="w-3 h-3 text-muted" :stroke-width="2.2" />{{ s.city }} · {{ formatDate(s.from, 'd MMM') }} – {{ formatDate(s.to, 'd MMM') }}
            </span>
          </div>

          <template v-if="hotels.length">
            <h3 class="list-header mt-6">Hébergements</h3>
            <div class="list" style="--sep-inset: 56px">
              <button v-for="h in hotels" :key="h.i" type="button" class="row !items-start" :class="{ 'opacity-40': !selected.has(h.i) }" @click="toggle(h.i)">
                <span class="row-icon mt-0.5" :style="{ background: ACTIVITY_TYPES.hotel.color }"><component :is="ACTIVITY_TYPES.hotel.icon" class="w-[17px] h-[17px]" :stroke-width="2" /></span>
                <span class="flex-1 min-w-0">
                  <span class="block t-body font-medium">{{ h.name }}</span>
                  <span class="block t-subhead text-muted">{{ h.city }} · {{ formatDate(h.date, 'd MMM') }} – {{ formatDate(h.endDate, 'd MMM') }} · {{ nightsBetween(h.date, h.endDate) }} nuits</span>
                  <span v-if="h.price" class="block t-footnote text-muted">~{{ new Intl.NumberFormat('fr-FR').format(h.price) }} {{ symbol }}</span>
                </span>
                <span class="check" :class="{ on: selected.has(h.i) }"><Check class="w-3.5 h-3.5" :stroke-width="3" /></span>
              </button>
            </div>
          </template>

          <section v-for="d in byDay" :key="d.date">
            <h3 class="list-header mt-6 normal-case first-letter:uppercase">{{ formatDate(d.date, 'EEEE d MMMM') }}<span v-if="d.city"> · {{ d.city }}</span></h3>
            <div class="list" style="--sep-inset: 72px">
              <button v-for="it in d.list" :key="it.i" type="button" class="row !items-start" :class="{ 'opacity-40': !selected.has(it.i) }" @click="toggle(it.i)">
                <span class="w-11 flex-shrink-0 t-subhead font-semibold pt-px">{{ formatTime(it.date) }}</span>
                <span class="flex-1 min-w-0">
                  <span class="flex items-center gap-1.5">
                    <component :is="ACTIVITY_TYPES[it.type].icon" class="w-3.5 h-3.5 flex-shrink-0" :style="{ color: ACTIVITY_TYPES[it.type].color }" :stroke-width="2.2" />
                    <span class="t-body font-medium truncate">{{ it.name }}</span>
                  </span>
                  <span class="block t-subhead text-muted truncate">{{ [it.category, it.city].filter(Boolean).join(' · ') }}<template v-if="it.price"> · ~{{ new Intl.NumberFormat('fr-FR').format(it.price) }} {{ symbol }}</template></span>
                  <span v-if="it.notes" class="block t-footnote text-muted mt-0.5">{{ it.notes }}</span>
                </span>
                <span class="check" :class="{ on: selected.has(it.i) }"><Check class="w-3.5 h-3.5" :stroke-width="3" /></span>
              </button>
            </div>
          </section>
          <p class="list-footer mt-2">Suggestions générées par IA : vérifie horaires, adresses et réservations. Chaque lieu a un lien Plans pour vérifier.</p>
        </div>

        <div class="flex-shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] material hairline-t">
          <p class="t-footnote text-muted text-center mb-2">{{ selectedCount }} élément{{ selectedCount > 1 ? 's' : '' }}<template v-if="selectedTotal"> · ~{{ new Intl.NumberFormat('fr-FR').format(selectedTotal) }} {{ symbol }}</template></p>
          <div class="flex gap-2">
            <button type="button" class="btn btn-gray !px-4" aria-label="Régénérer" @click="step = 'prefs'"><RefreshCw class="w-5 h-5" :stroke-width="2.2" /></button>
            <button type="button" class="btn btn-primary flex-1" :disabled="!selectedCount || saving" @click="addSelected">
              <van-loading v-if="saving" size="18" color="#fff" />
              <template v-else>Ajouter au voyage</template>
            </button>
          </div>
        </div>
      </template>
    </div>
  </van-popup>
</template>

<style scoped>
.pill {
  @apply rounded-full whitespace-nowrap transition;
  height: 34px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 500;
  background: var(--vc-surface);
  color: var(--vc-text);
}
.pill:active { opacity: 0.6; }
.pill[aria-pressed='true'] { background: var(--vc-primary); color: #fff; }
.check {
  @apply w-[22px] h-[22px] mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 transition;
  box-shadow: inset 0 0 0 1.5px var(--vc-subtle);
  color: transparent;
}
.check.on { background: var(--vc-primary); color: #fff; box-shadow: none; }
</style>
