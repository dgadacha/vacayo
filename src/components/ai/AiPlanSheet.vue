<script setup>
import { ref, computed, inject, watch } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { planWishlist, aiErrorMessage } from '@/services/ai'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { formatDate } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import AiSheetHeader from './AiSheetHeader.vue'
import { Wand2, Check, RefreshCw, CircleSlash } from 'lucide-vue-next'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const activities = useActivitiesStore()
const trip = inject('trip')
const toast = useToast()

const loading = ref(false)
const error = ref('')
const plan = ref(null)
const selected = ref(new Set())
const applying = ref(false)
let abort = null

const byDay = computed(() => {
  const map = new Map()
  ;(plan.value?.assignments || []).forEach(a => {
    if (!map.has(a.date)) map.set(a.date, [])
    map.get(a.date).push(a)
  })
  return [...map.entries()].map(([date, items]) => ({ date, items }))
})
const selectedCount = computed(() => selected.value.size)

watch(() => props.modelValue, (open) => {
  if (open) run()
  else { abort?.abort(); plan.value = null }
})

async function run() {
  error.value = ''
  loading.value = true
  abort = new AbortController()
  try {
    plan.value = await planWishlist({ trip: trip.value, items: activities.all, signal: abort.signal })
    selected.value = new Set(plan.value.assignments.map(a => a.id))
  } catch (e) {
    error.value = aiErrorMessage(e)
  } finally {
    loading.value = false
    abort = null
  }
}

function toggle(id) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}

async function apply() {
  if (!selectedCount.value || applying.value) return
  applying.value = true
  try {
    const chosen = plan.value.assignments.filter(a => selected.value.has(a.id))
    await Promise.all(chosen.map(a => activities.updateActivity(a.id, { date: `${a.date}T${a.time}` })))
    toast.success(`${chosen.length} élément${chosen.length > 1 ? 's' : ''} planifié${chosen.length > 1 ? 's' : ''}`)
    emit('update:modelValue', false)
  } catch (e) {
    toast.error(e.message || 'Erreur lors de la mise à jour')
  } finally {
    applying.value = false
  }
}

function close() { emit('update:modelValue', false) }
</script>

<template>
  <van-popup :show="modelValue" position="bottom" round teleport="body" :style="{ height: '94vh', background: 'var(--vc-bg)' }" @update:show="emit('update:modelValue', $event)">
    <div class="h-full flex flex-col">
      <AiSheetHeader title="Planifier la liste d’envies" subtitle="L'IA répartit tes idées sur le séjour" :icon="Wand2" @close="close" />

      <div class="flex-1 overflow-y-auto px-4 py-4">
        <div v-if="loading" class="space-y-3">
          <p class="text-sm font-medium text-center ai-text">Haiku organise ton séjour…</p>
          <p class="text-xs text-muted text-center">Il regarde où tu dors chaque nuit et ce qui est déjà prévu.</p>
          <div v-for="i in 3" :key="i" class="shimmer h-28 !rounded-2xl" />
        </div>

        <div v-else-if="error" class="text-center py-10">
          <p role="alert" class="rounded-xl px-3 py-2.5 text-sm bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{{ error }}</p>
          <button type="button" class="btn btn-secondary mt-4" @click="run"><RefreshCw class="w-4 h-4" :stroke-width="2" />Réessayer</button>
        </div>

        <template v-else-if="plan">
          <p v-if="plan.summary" class="text-sm leading-relaxed rounded-2xl px-4 py-3" style="background: var(--vc-primary-soft)">{{ plan.summary }}</p>

          <section v-for="d in byDay" :key="d.date" class="mt-5">
            <h3 class="t-footnote text-muted mb-2 px-1 first-letter:uppercase">{{ formatDate(d.date, 'EEEE d MMMM') }}</h3>
            <div class="space-y-2">
              <button
                v-for="a in d.items"
                :key="a.id"
                type="button"
                class="card w-full text-left p-3 flex gap-3 items-start transition"
                :class="selected.has(a.id) ? '' : 'opacity-50'"
                :aria-pressed="selected.has(a.id)"
                @click="toggle(a.id)"
              >
                <span class="w-12 text-center flex-shrink-0 pt-0.5">
                  <span class="block text-sm font-bold">{{ a.time }}</span>
                </span>
                <span class="flex-1 min-w-0">
                  <span class="flex items-center gap-1.5">
                    <component :is="ACTIVITY_TYPES[a.item.type]?.icon" class="w-3.5 h-3.5 flex-shrink-0" :style="{ color: ACTIVITY_TYPES[a.item.type]?.color }" :stroke-width="2.2" />
                    <span class="font-semibold text-[15px] leading-snug truncate">{{ a.item.name }}</span>
                  </span>
                  <span v-if="a.item.city" class="block text-xs text-muted mt-0.5">{{ a.item.city }}</span>
                  <span class="block text-xs text-muted mt-1 leading-relaxed">{{ a.why }}</span>
                </span>
                <span class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ring-1 transition" :class="selected.has(a.id) ? 'text-white ring-transparent' : 'ring-slate-300 dark:ring-slate-600 text-transparent'" :style="selected.has(a.id) ? { background: 'var(--vc-primary)' } : {}">
                  <Check class="w-3.5 h-3.5" :stroke-width="3" />
                </span>
              </button>
            </div>
          </section>

          <section v-if="plan.unplaced.length" class="mt-6">
            <h3 class="section-label mb-2 flex items-center gap-1.5"><CircleSlash class="w-3.5 h-3.5" :stroke-width="2" />Non placés</h3>
            <div class="card divide-y" style="--tw-divide-opacity: 1">
              <div v-for="u in plan.unplaced" :key="u.id" class="px-3.5 py-2.5" style="border-color: var(--vc-border-soft)">
                <p class="text-sm font-medium">{{ u.item.name }}</p>
                <p class="text-xs text-muted mt-0.5">{{ u.why }}</p>
              </div>
            </div>
          </section>

          <div v-if="!plan.assignments.length && !plan.unplaced.length" class="text-center py-10 text-sm text-muted">{{ plan.summary || 'Rien à planifier.' }}</div>
        </template>
      </div>

      <div v-if="plan && plan.assignments.length && !loading" class="flex-shrink-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t flex gap-2" style="border-color: var(--vc-border-soft)">
        <button type="button" class="btn btn-secondary" aria-label="Proposer un autre planning" @click="run"><RefreshCw class="w-4 h-4" :stroke-width="2" /></button>
        <button type="button" class="btn btn-primary flex-1" :disabled="!selectedCount || applying" @click="apply">
          <van-loading v-if="applying" size="16" color="currentColor" />
          <template v-else>Planifier {{ selectedCount }} élément{{ selectedCount > 1 ? 's' : '' }}</template>
        </button>
      </div>
    </div>
  </van-popup>
</template>
