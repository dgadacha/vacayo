<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { extractFromText, aiErrorMessage, mapsSearchUrl } from '@/services/ai'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { formatDate, formatTime } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import AiSheetHeader from './AiSheetHeader.vue'
import { ClipboardPaste, Wand2, Check, BadgeCheck, ArrowLeft } from 'lucide-vue-next'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const activities = useActivitiesStore()
const trip = inject('trip')
const toast = useToast()

const step = ref('input') // input | loading | review
const text = ref('')
const results = ref([])
const selected = ref(new Set())
const error = ref('')
const saving = ref(false)
let abort = null

const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText
const symbol = computed(() => trip.value?.currencySymbol || '€')
const selectedCount = computed(() => selected.value.size)

watch(() => props.modelValue, (open) => { if (!open) abort?.abort() })

async function pasteFromClipboard() {
  try { text.value = await navigator.clipboard.readText() }
  catch { toast.error('Accès au presse-papiers refusé — colle le texte à la main') }
}

async function analyze() {
  if (!text.value.trim()) return
  error.value = ''
  step.value = 'loading'
  abort = new AbortController()
  try {
    results.value = await extractFromText({ trip: trip.value, items: activities.all, text: text.value, signal: abort.signal })
    selected.value = new Set(results.value.map((_, i) => i))
    step.value = 'review'
  } catch (e) {
    error.value = aiErrorMessage(e)
    step.value = 'input'
  } finally {
    abort = null
  }
}

function toggle(i) {
  const s = new Set(selected.value)
  s.has(i) ? s.delete(i) : s.add(i)
  selected.value = s
}

function whenLabel(r) {
  if (!r.date) return 'Sans date'
  if (r.type === 'hotel' && r.endDate) return `${formatDate(r.date, 'd MMM')} → ${formatDate(r.endDate, 'd MMM')}`
  const t = formatTime(r.date)
  return `${formatDate(r.date, 'EEE d MMM')}${t ? ' · ' + t : ''}`
}

async function addSelected() {
  if (!selectedCount.value || saving.value) return
  saving.value = true
  try {
    const chosen = results.value.filter((_, i) => selected.value.has(i))
    for (const r of chosen) {
      await activities.addActivity({ ...r, googleMapsUrl: mapsSearchUrl(r.name, r.city) })
    }
    toast.success(`${chosen.length} élément${chosen.length > 1 ? 's' : ''} ajouté${chosen.length > 1 ? 's' : ''}`)
    reset()
    emit('update:modelValue', false)
  } catch (e) {
    toast.error(e.message || "Erreur lors de l'ajout")
  } finally {
    saving.value = false
  }
}

function reset() {
  step.value = 'input'
  text.value = ''
  results.value = []
  selected.value = new Set()
  error.value = ''
}
function close() { emit('update:modelValue', false) }
</script>

<template>
  <van-popup :show="modelValue" position="bottom" round teleport="body" :style="{ height: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }" @update:show="emit('update:modelValue', $event)">
    <div class="h-full flex flex-col">
      <AiSheetHeader title="Ajout magique" subtitle="Colle un texte, l'IA crée les fiches" :icon="Wand2" @close="close" />

      <!-- 1. Paste -->
      <div v-if="step === 'input'" class="flex-1 flex flex-col px-4 py-4 min-h-0">
        <p class="t-subhead text-muted">Mail de confirmation d'hôtel, liste de restos d'un ami, article de blog, notes… L'IA repère les lieux, dates, prix et numéros de réservation.</p>
        <textarea
          v-model="text"
          class="mt-3 flex-1 min-h-[10rem] w-full rounded-xl surface px-4 py-3 text-[17px] leading-[22px] outline-none resize-none focus:ring-2"
          style="--tw-ring-color: var(--vc-primary)"
          placeholder="Ex. « Votre réservation au Ryokan Yachiyo du 14 au 17 nov. est confirmée (n° 8842)… »"
          aria-label="Texte à analyser"
        />
        <p v-if="error" role="alert" class="mt-3 rounded-xl px-3 py-2.5 text-sm bg-rose-50 text-rose-700">{{ error }}</p>
        <div class="mt-3 flex gap-2 pb-[env(safe-area-inset-bottom)]">
          <button v-if="canPaste" type="button" class="btn btn-secondary" @click="pasteFromClipboard"><ClipboardPaste class="w-4 h-4" :stroke-width="2" />Coller</button>
          <button type="button" class="btn btn-ai flex-1" :disabled="!text.trim()" @click="analyze"><Wand2 class="w-4 h-4" :stroke-width="2" />Analyser</button>
        </div>
      </div>

      <!-- 2. Working -->
      <div v-else-if="step === 'loading'" class="flex-1 px-4 py-6 space-y-3">
        <p class="text-sm font-medium text-center ai-text">Haiku lit ton texte…</p>
        <div v-for="i in 3" :key="i" class="shimmer h-20 !rounded-2xl" />
      </div>

      <!-- 3. Review -->
      <template v-else>
        <div class="flex-1 overflow-y-auto px-4 py-4">
          <div v-if="!results.length" class="text-center py-12">
            <p class="font-semibold">Aucun lieu trouvé</p>
            <p class="text-sm text-muted mt-1">Le texte ne semble pas contenir d'hôtel, de restaurant ou d'activité.</p>
          </div>
          <template v-else>
            <p class="text-sm text-muted mb-3">{{ results.length }} élément{{ results.length > 1 ? 's' : '' }} trouvé{{ results.length > 1 ? 's' : '' }}. Décoche ce que tu ne veux pas ajouter.</p>
            <div class="space-y-2">
              <button
                v-for="(r, i) in results"
                :key="i"
                type="button"
                class="card w-full text-left p-3 flex gap-3 items-start transition"
                :class="selected.has(i) ? '' : 'opacity-50'"
                :aria-pressed="selected.has(i)"
                @click="toggle(i)"
              >
                <span class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" :class="ACTIVITY_TYPES[r.type]?.soft">
                  <component :is="ACTIVITY_TYPES[r.type]?.icon" class="w-[18px] h-[18px]" :stroke-width="2" />
                </span>
                <span class="flex-1 min-w-0">
                  <span class="block font-semibold text-[15px] leading-snug">{{ r.name }}</span>
                  <span class="block text-xs text-muted mt-0.5">{{ [r.category, r.city].filter(Boolean).join(' · ') }}</span>
                  <span class="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs">
                    <span :class="r.date ? '' : 'text-subtle italic'">{{ whenLabel(r) }}</span>
                    <span v-if="r.price" class="font-semibold">{{ new Intl.NumberFormat('fr-FR').format(r.price) }} {{ symbol }}</span>
                    <span v-if="r.isBooked" class="chip bg-emerald-50 text-emerald-700 ring-emerald-200"><BadgeCheck class="w-3 h-3" :stroke-width="2" />Réservé</span>
                  </span>
                  <span v-if="r.notes" class="block text-xs text-subtle mt-1.5 line-clamp-2 whitespace-pre-line">{{ r.notes }}</span>
                </span>
                <span class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ring-1 transition" :class="selected.has(i) ? 'text-white ring-transparent' : 'ring-slate-300 text-transparent'" :style="selected.has(i) ? { background: 'var(--vc-primary)' } : {}">
                  <Check class="w-3.5 h-3.5" :stroke-width="3" />
                </span>
              </button>
            </div>
          </template>
        </div>
        <div class="flex-shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t flex gap-2" style="border-color: var(--vc-border-soft)">
          <button type="button" class="btn btn-secondary" @click="step = 'input'"><ArrowLeft class="w-4 h-4" :stroke-width="2" />Texte</button>
          <button type="button" class="btn btn-primary flex-1" :disabled="!selectedCount || saving" @click="addSelected">
            <van-loading v-if="saving" size="16" color="currentColor" />
            <template v-else>Ajouter {{ selectedCount }} élément{{ selectedCount > 1 ? 's' : '' }}</template>
          </button>
        </div>
      </template>
    </div>
  </van-popup>
</template>
