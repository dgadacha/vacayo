<script setup>
import { computed, inject, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { formatPrice } from '@/utils/helpers'
import { Wallet, TrendingUp, AlertTriangle, Plus, Receipt } from 'lucide-vue-next'

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(false))
const openTripEditor = inject('openTripEditor', null)

const symbol = computed(() => trip.value?.currencySymbol || '€')
const budget = computed(() => Number(trip.value?.budget) || 0)
const spent = computed(() => activities.stats.totalPrice)
const scheduledCount = computed(() => activities.stats.scheduledCount)
const wishlistPrice = computed(() => activities.stats.wishlistPrice)
const totalItems = computed(() => activities.stats.total)
const hasBudget = computed(() => budget.value > 0)

const percent = computed(() => hasBudget.value ? Math.min(100, (spent.value / budget.value) * 100) : 0)
const exceeded = computed(() => hasBudget.value && spent.value > budget.value)
const remaining = computed(() => budget.value - spent.value)

const tone = computed(() => {
  if (!hasBudget.value) return 'slate'
  if (exceeded.value) return 'red'
  if (percent.value >= 85) return 'amber'
  return 'emerald'
})

const barColor = computed(() => ({
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-slate-400 dark:bg-slate-500'
}[tone.value]))

const textColor = computed(() => ({
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  slate: 'text-slate-500 dark:text-slate-400'
}[tone.value]))

function openEditor() { openTripEditor?.() }
</script>

<template>
  <section class="card p-4 mx-4 mt-3">
    <!-- No budget mode: just show total spent + CTA -->
    <template v-if="!hasBudget">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
            <Receipt class="w-4 h-4" :stroke-width="2" />
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Coût du voyage</p>
            <p class="text-xl font-extrabold tabular-nums leading-tight">{{ formatPrice(spent, symbol) }}</p>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {{ scheduledCount }} item{{ scheduledCount > 1 ? 's' : '' }} planifié{{ scheduledCount > 1 ? 's' : '' }}<span v-if="wishlistPrice > 0"> · {{ formatPrice(wishlistPrice, symbol) }} en wishlist</span>
            </p>
          </div>
        </div>
        <button
          v-if="canEdit && openTripEditor"
          @click="openEditor"
          class="btn-secondary !text-xs !py-1.5 !px-2.5 flex-shrink-0"
        >
          <Plus class="w-3.5 h-3.5" :stroke-width="2.5" />
          Budget
        </button>
      </div>
    </template>

    <!-- Budget mode: spent / total + progress bar -->
    <template v-else>
      <div class="flex items-center justify-between gap-3 mb-2.5">
        <div class="flex items-center gap-2 min-w-0">
          <Wallet class="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" :stroke-width="2" />
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Budget</p>
        </div>
        <div class="flex items-center gap-1.5 text-xs" :class="textColor">
          <AlertTriangle v-if="exceeded" class="w-3.5 h-3.5" :stroke-width="2" />
          <TrendingUp v-else class="w-3.5 h-3.5" :stroke-width="2" />
          <span class="font-bold">{{ Math.round(percent) }}%</span>
        </div>
      </div>

      <div class="flex items-baseline justify-between gap-2 mb-2">
        <p class="text-xl font-extrabold tabular-nums">{{ formatPrice(spent, symbol) }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          / <span class="font-semibold text-slate-700 dark:text-slate-300">{{ formatPrice(budget, symbol) }}</span>
        </p>
      </div>

      <div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div class="h-full transition-all duration-500 rounded-full" :class="barColor" :style="{ width: percent + '%' }" />
      </div>

      <div class="flex items-center justify-between gap-2 mt-1.5">
        <p class="text-[11px] font-medium" :class="exceeded ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'">
          <template v-if="exceeded">Dépassement de {{ formatPrice(spent - budget, symbol) }}</template>
          <template v-else>Reste {{ formatPrice(remaining, symbol) }}</template>
        </p>
        <p class="text-[11px] text-slate-400 dark:text-slate-500">
          {{ scheduledCount }} planifié{{ scheduledCount > 1 ? 's' : '' }}<span v-if="wishlistPrice > 0"> · {{ formatPrice(wishlistPrice, symbol) }} wishlist</span>
        </p>
      </div>
    </template>
  </section>
</template>
