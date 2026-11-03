<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { Sparkles, Check } from 'lucide-vue-next'

// Waiting screen of the trip generator. Steps and bar follow the streamed answer
// (stages, hotels, then the day being written); a time-based floor keeps the bar
// moving between chunks so it never looks stuck.
const props = defineProps({
  progress: { type: Object, default: null }, // from generateTrip's onProgress
  done: Boolean,
  destination: { type: String, default: '' },
  days: { type: Number, default: 1 },
  startDate: { type: String, default: '' },
  pace: { type: String, default: 'balanced' },
  keepHotels: Boolean
})

const PER_DAY = { calm: 4, balanced: 5, intense: 6.5 } // activities + lunch + dinner

const elapsed = ref(0)
let timer = null
onMounted(() => {
  const t0 = Date.now()
  timer = setInterval(() => { elapsed.value = (Date.now() - t0) / 1000 }, 250)
})
onBeforeUnmount(() => clearInterval(timer))

const p = computed(() => props.progress || { cities: [], inItems: false, hotels: 0, places: 0, lastDate: '' })
const day = computed(() => {
  if (!p.value.lastDate || !props.startDate) return 0
  const n = Math.round((new Date(p.value.lastDate) - new Date(props.startDate)) / 86400000) + 1
  return Math.min(Math.max(n, 1), props.days)
})

// Index of the step in progress (4 = all done). The first step lasts at least
// 1.5 s so it can be read, and at most 4 s while the model has not answered yet.
const stage = computed(() => {
  if (props.done) return 4
  if (p.value.places) return 3
  if (p.value.inItems) return 2
  if ((props.progress && elapsed.value > 1.5) || elapsed.value > 4) return 1
  return 0
})

const steps = computed(() => [
  { label: 'Lecture de tes dates et envies', detail: [props.destination, `${props.days} jour${props.days > 1 ? 's' : ''}`].filter(Boolean).join(' · ') },
  { label: 'Choix des étapes', detail: p.value.cities.join(' · ') },
  {
    label: 'Sélection des hôtels',
    detail: p.value.hotels ? `${p.value.hotels} hôtel${p.value.hotels > 1 ? 's' : ''}` : (props.keepHotels ? 'Tes hôtels sont conservés' : '')
  },
  {
    label: 'Programme jour par jour',
    detail: day.value ? `Jour ${day.value} sur ${props.days} · ${p.value.places} lieu${p.value.places > 1 ? 'x' : ''}` : ''
  }
])

// ~36 s for a week with Haiku
const expectedSeconds = computed(() => 8 + props.days * 4)
const fromStream = computed(() => {
  if (!p.value.inItems) return stage.value ? 0.06 + Math.min(p.value.cities.length, 4) * 0.02 : 0.02
  const byDay = day.value ? (day.value - 0.5) / props.days : 0
  const byCount = (p.value.hotels + p.value.places) / (props.days * PER_DAY[props.pace] + 2)
  return 0.15 + 0.8 * Math.min(1, Math.max(byDay, byCount))
})
const fromTime = computed(() => 0.9 * (1 - Math.exp(-elapsed.value / expectedSeconds.value)))

// Only ever moves forward
const value = ref(0)
watchEffect(() => {
  const target = props.done ? 1 : Math.min(0.97, Math.max(fromStream.value, fromTime.value))
  if (target > value.value) value.value = target
})
const percent = computed(() => Math.round(value.value * 100))
</script>

<template>
  <div class="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 py-6 text-center">
    <div class="ai-glow rounded-[22px]">
      <div class="w-[72px] h-[72px] rounded-[20px] flex items-center justify-center text-white" style="background: var(--vc-ai)">
        <Sparkles class="w-9 h-9" :class="done ? '' : 'animate-pulse'" :stroke-width="1.6" />
      </div>
    </div>
    <p class="t-title3 mt-5">{{ done ? 'Ton voyage est prêt' : 'Création de ton voyage' }}</p>

    <div class="w-full max-w-xs mt-4">
      <div
        class="h-1.5 rounded-full overflow-hidden"
        style="background: var(--vc-fill)"
        role="progressbar"
        aria-label="Avancement"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percent"
      >
        <div class="h-full rounded-full transition-[width] duration-500 ease-out" :style="{ width: `${percent}%`, background: 'var(--vc-ai)' }" />
      </div>
      <p class="t-footnote text-muted mt-1.5 tabular-nums">{{ percent }} %</p>
    </div>

    <ol class="list w-full max-w-sm !mx-0 mt-6 text-left" style="--sep-inset: 52px">
      <li v-for="(s, i) in steps" :key="s.label" class="row !min-h-[52px]">
        <span class="w-6 h-6 flex items-center justify-center shrink-0">
          <span v-if="i < stage" class="w-6 h-6 rounded-full flex items-center justify-center text-white" style="background: var(--vc-green)">
            <Check class="w-3.5 h-3.5" :stroke-width="3" />
          </span>
          <van-loading v-else-if="i === stage" size="20" />
          <span v-else class="w-[22px] h-[22px] rounded-full border-2" style="border-color: var(--vc-fill)" />
        </span>
        <span class="min-w-0">
          <span class="block t-body" :class="i > stage ? 'text-subtle' : ''">{{ s.label }}</span>
          <span v-if="s.detail && i <= stage" class="block t-footnote text-muted truncate">{{ s.detail }}</span>
        </span>
      </li>
    </ol>

    <slot />
  </div>
</template>
