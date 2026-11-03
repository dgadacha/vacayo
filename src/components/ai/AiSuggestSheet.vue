<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { suggestIdeas, aiErrorMessage, mapsSearchUrl } from '@/services/ai'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { useToast } from '@/composables/useToast'
import AiSheetHeader from './AiSheetHeader.vue'
import { Lightbulb, Plus, Check, MapPin, RefreshCw, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  type: { type: String, default: 'activity' }
})
const emit = defineEmits(['update:modelValue'])

const activities = useActivitiesStore()
const trip = inject('trip')
const toast = useToast()

const kind = ref(props.type)
const wish = ref('')
const loading = ref(false)
const error = ref('')
const ideas = ref([])
const added = ref(new Set())
const shown = ref([]) // names already proposed, to ask for new ones next time
let abort = null

const symbol = computed(() => trip.value?.currencySymbol || '€')
const CHIPS = {
  hotel: ['Bon rapport qualité/prix', 'Ryokan / typique', 'Proche des transports', 'Avec vue'],
  restaurant: ['Spécialités locales', 'Pas cher', 'Pour une occasion', 'Street food'],
  activity: ['Incontournables', 'Hors des sentiers battus', 'Musées', 'Nature', 'Si il pleut']
}

watch(() => props.modelValue, (open) => {
  if (open) {
    if (kind.value !== props.type) { kind.value = props.type; ideas.value = []; shown.value = [] }
  } else abort?.abort()
})

async function run(w = wish.value) {
  if (loading.value) return
  wish.value = w
  error.value = ''
  loading.value = true
  abort = new AbortController()
  try {
    const avoid = shown.value.length ? ` Évite aussi : ${shown.value.join(', ')}.` : ''
    const list = await suggestIdeas({ trip: trip.value, items: activities.all, type: kind.value, wish: (w + avoid).trim(), signal: abort.signal })
    ideas.value = list
    shown.value = [...shown.value, ...list.map(i => i.name)].slice(-30)
    added.value = new Set()
  } catch (e) {
    error.value = aiErrorMessage(e)
  } finally {
    loading.value = false
    abort = null
  }
}

function setKind(k) {
  if (k === kind.value) return
  kind.value = k
  ideas.value = []
  shown.value = []
  wish.value = ''
}

async function add(idea, i) {
  if (added.value.has(i)) return
  try {
    await activities.addActivity({
      type: idea.type || kind.value,
      name: idea.name,
      city: idea.city,
      category: idea.category,
      price: Math.round(idea.price) || 0,
      priority: idea.priority,
      notes: [idea.why, idea.tip && `• ${idea.tip}`].filter(Boolean).join('\n'),
      googleMapsUrl: mapsSearchUrl(idea.name, idea.city)
    })
    added.value = new Set([...added.value, i])
    toast.success('Ajouté à ta liste d’envies')
  } catch (e) {
    toast.error(e.message || "Erreur lors de l'ajout")
  }
}

function priority(p) { return PRIORITY_OPTIONS.find(o => o.value === p) }
function close() { emit('update:modelValue', false) }
</script>

<template>
  <van-popup :show="modelValue" position="bottom" round teleport="body" :style="{ height: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }" @update:show="emit('update:modelValue', $event)">
    <div class="h-full flex flex-col">
      <AiSheetHeader title="Idées de l'IA" :subtitle="trip?.destination ? `Pour ${trip.destination}` : 'Selon ton voyage'" :icon="Lightbulb" @close="close" />

      <div class="flex-shrink-0 px-4 pt-3 space-y-3">
        <div class="segmented">
          <button v-for="(m, k) in ACTIVITY_TYPES" :key="k" type="button" :aria-pressed="kind === k" @click="setKind(k)">{{ m.plural }}</button>
        </div>
        <form class="flex gap-2" @submit.prevent="run()">
          <input v-model="wish" type="text" class="flex-1 min-w-0 h-[50px] rounded-[14px] surface px-4 text-[17px] outline-none focus:ring-2" style="--tw-ring-color: var(--vc-primary)" placeholder="Une envie précise ? (facultatif)" aria-label="Envie" />
          <button type="submit" class="btn btn-ai" :disabled="loading"><Sparkles class="w-4 h-4" :stroke-width="2" />Proposer</button>
        </form>
        <div data-no-swipe class="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
          <button v-for="c in CHIPS[kind]" :key="c" type="button" class="h-8 px-3.5 rounded-full text-[15px] font-medium whitespace-nowrap flex-shrink-0 surface active:opacity-60" :disabled="loading" @click="run(c)">{{ c }}</button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <p v-if="error" role="alert" class="rounded-xl px-3 py-2.5 text-sm bg-rose-50 text-rose-700">{{ error }}</p>

        <div v-if="loading" class="space-y-2.5 pt-1">
          <p class="text-sm font-medium text-center ai-text">Haiku cherche des idées…</p>
          <div v-for="i in 4" :key="i" class="shimmer h-28 !rounded-2xl" />
        </div>

        <div v-else-if="!ideas.length && !error" class="text-center pt-10 px-6">
          <div class="inline-flex w-14 h-14 rounded-2xl items-center justify-center" :class="ACTIVITY_TYPES[kind].soft">
            <component :is="ACTIVITY_TYPES[kind].icon" class="w-7 h-7" :stroke-width="1.75" />
          </div>
          <p class="mt-3 font-semibold">Des idées sur mesure</p>
          <p class="text-sm text-muted mt-1">L'IA tient compte de tes villes étapes et de ce que tu as déjà prévu. Les idées ajoutées vont dans ta liste d’envies (sans date).</p>
        </div>

        <div v-else class="space-y-2.5 pt-1">
          <article v-for="(idea, i) in ideas" :key="idea.name + i" class="card p-3.5">
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-[15px] leading-snug">{{ idea.name }}</h3>
                <p class="text-xs text-muted mt-0.5 flex items-center gap-1 flex-wrap">
                  <span>{{ idea.category }}</span>
                  <template v-if="idea.city"><span class="text-subtle">·</span><MapPin class="w-3 h-3" :stroke-width="2" />{{ idea.city }}</template>
                  <template v-if="idea.price"><span class="text-subtle">·</span><span class="font-semibold" style="color: var(--vc-text)">~{{ new Intl.NumberFormat('fr-FR').format(Math.round(idea.price)) }} {{ symbol }}</span></template>
                </p>
              </div>
              <button
                type="button"
                class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition"
                :class="added.has(i) ? 'bg-emerald-500 text-white' : ''"
                :style="added.has(i) ? {} : { background: 'var(--vc-primary-soft)', color: 'var(--vc-primary)' }"
                :aria-label="added.has(i) ? 'Ajouté' : `Ajouter ${idea.name}`"
                @click="add(idea, i)"
              >
                <Check v-if="added.has(i)" class="w-4 h-4" :stroke-width="3" />
                <Plus v-else class="w-4 h-4" :stroke-width="2.5" />
              </button>
            </div>
            <p class="text-[13px] mt-2 leading-relaxed">{{ idea.why }}</p>
            <p v-if="idea.tip" class="text-xs text-muted mt-1.5 leading-relaxed">💡 {{ idea.tip }}</p>
            <span v-if="priority(idea.priority) && idea.priority !== 'normal'" class="chip mt-2" :class="priority(idea.priority).color">{{ priority(idea.priority).label }}</span>
          </article>
          <button type="button" class="btn btn-secondary w-full !mt-4" @click="run()"><RefreshCw class="w-4 h-4" :stroke-width="2" />D'autres idées</button>
          <p class="text-[11px] text-subtle text-center pt-1">Suggestions générées par IA : vérifie horaires et adresses avant d'y aller.</p>
        </div>
      </div>
    </div>
  </van-popup>
</template>
