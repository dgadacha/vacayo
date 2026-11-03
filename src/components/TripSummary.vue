<script setup>
import { computed, inject, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { formatPrice, formatCompact } from '@/utils/helpers'
import { Sparkles, ChevronRight, Plus } from 'lucide-vue-next'

const emit = defineEmits(['plan'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(false))
const openTripEditor = inject('openTripEditor', null)

const symbol = computed(() => trip.value?.currencySymbol || '€')
const stats = computed(() => activities.stats)
const budget = computed(() => Number(trip.value?.budget) || 0)
const spent = computed(() => stats.value.totalPrice)
const donePct = computed(() => stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0)
const budgetPct = computed(() => budget.value ? Math.min(100, (spent.value / budget.value) * 100) : 0)
const exceeded = computed(() => budget.value > 0 && spent.value > budget.value)
const wishlist = computed(() => activities.all.filter(a => a.type !== 'hotel' && !a.date).length)

// SVG ring: r = 15.9 gives a circumference of ~100, so dasharray = percent
const ringDash = computed(() => `${donePct.value} 100`)
const barColor = computed(() => exceeded.value ? '#e11d48' : budgetPct.value >= 85 ? '#d97706' : 'var(--vc-primary)')
</script>

<template>
  <section class="card mx-4 p-4 relative z-10">
    <div class="grid grid-cols-3 gap-2">
      <div class="flex items-center gap-2.5 min-w-0">
        <svg viewBox="0 0 36 36" class="w-11 h-11 -rotate-90 flex-shrink-0" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--vc-surface-2)" stroke-width="3.5" />
          <circle v-if="donePct > 0" cx="18" cy="18" r="15.9" fill="none" stroke="var(--vc-primary)" stroke-width="3.5" stroke-linecap="round" :stroke-dasharray="ringDash" class="transition-all duration-500" />
        </svg>
        <div class="min-w-0">
          <p class="text-base font-bold leading-tight">{{ donePct }}%</p>
          <p class="text-[11px] text-muted leading-tight">{{ stats.done }}/{{ stats.total }} faits</p>
        </div>
      </div>
      <div class="text-center border-x" style="border-color: var(--vc-border-soft)">
        <p class="text-base font-bold leading-tight">{{ stats.booked }}</p>
        <p class="text-[11px] text-muted leading-tight">réservés</p>
        <p class="text-[10px] text-subtle leading-tight mt-0.5">{{ stats.hotels }} hôtel{{ stats.hotels > 1 ? 's' : '' }}</p>
      </div>
      <div class="text-right min-w-0">
        <p class="text-base font-bold leading-tight truncate" :class="{ 'text-rose-600 dark:text-rose-400': exceeded }">{{ formatCompact(spent, symbol) }}</p>
        <p class="text-[11px] text-muted leading-tight truncate">{{ budget ? `sur ${formatCompact(budget, symbol)}` : 'planifié' }}</p>
      </div>
    </div>

    <div v-if="budget" class="mt-3.5">
      <div class="h-1.5 rounded-full overflow-hidden surface-2">
        <div class="h-full rounded-full transition-all duration-500" :style="{ width: budgetPct + '%', background: barColor }" />
      </div>
      <p class="mt-1.5 text-[11px] flex justify-between gap-2">
        <span :class="exceeded ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-muted'">
          {{ exceeded ? `Dépassement de ${formatPrice(spent - budget, symbol)}` : `Reste ${formatPrice(budget - spent, symbol)}` }}
        </span>
        <span v-if="stats.wishlistPrice > 0" class="text-subtle truncate">+ {{ formatCompact(stats.wishlistPrice, symbol) }} en wishlist</span>
      </p>
    </div>
    <button v-else-if="canEdit && openTripEditor" type="button" class="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold h-8 rounded-full surface-2" @click="openTripEditor()">
      <Plus class="w-3.5 h-3.5" :stroke-width="2.5" /> Définir un budget
    </button>

    <button v-if="canEdit && wishlist > 0" type="button" class="mt-3 w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left" style="background: var(--vc-primary-soft)" @click="emit('plan')">
      <Sparkles class="w-4 h-4 flex-shrink-0" style="color: var(--vc-primary)" :stroke-width="2" />
      <span class="flex-1 text-[13px] leading-tight">
        <strong>{{ wishlist }} élément{{ wishlist > 1 ? 's' : '' }}</strong> sans date
        <span class="block text-xs text-muted">L'IA peut les répartir sur ton séjour</span>
      </span>
      <ChevronRight class="w-4 h-4 text-muted" :stroke-width="2" />
    </button>
  </section>
</template>
