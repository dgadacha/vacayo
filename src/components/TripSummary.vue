<script setup>
import { computed, inject, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { formatPrice, formatCompact } from '@/utils/helpers'
import { Sparkles, ChevronRight } from 'lucide-vue-next'

const emit = defineEmits(['plan', 'generate'])

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(false))
const openTripEditor = inject('openTripEditor', null)

const symbol = computed(() => trip.value?.currencySymbol || '€')
const stats = computed(() => activities.stats)
const budget = computed(() => Number(trip.value?.budget) || 0)
const spent = computed(() => stats.value.totalPrice)
const donePct = computed(() => stats.value.total ? Math.round((stats.value.done / stats.value.total) * 100) : 0)
const bookedPct = computed(() => stats.value.total ? Math.round((stats.value.booked / stats.value.total) * 100) : 0)
const budgetPct = computed(() => budget.value ? Math.min(100, (spent.value / budget.value) * 100) : 0)
const exceeded = computed(() => budget.value > 0 && spent.value > budget.value)
const wishlist = computed(() => activities.all.filter(a => a.type !== 'hotel' && !a.date).length)
const barColor = computed(() => exceeded.value ? 'var(--vc-red)' : budgetPct.value >= 85 ? 'var(--vc-orange)' : 'var(--vc-primary)')

// Activity-style rings: r = 15.9 gives a circumference of ~100, so dasharray = percent
const dash = (pct) => `${Math.max(pct, 0.01)} 100`
</script>

<template>
  <div>
    <!-- Empty trip: the AI can draft everything from the destination and dates -->
    <button v-if="stats.total === 0 && canEdit" type="button" class="mx-4 w-[calc(100%-2rem)] rounded-xl overflow-hidden text-left text-white active:scale-[0.98] transition-transform mb-4" style="background: var(--vc-ai)" @click="emit('generate')">
      <div class="px-4 py-4 flex items-center gap-3">
        <Sparkles class="w-8 h-8 flex-shrink-0" :stroke-width="1.8" />
        <div class="flex-1 min-w-0">
          <p class="t-headline">Générer le voyage avec l’IA</p>
          <p class="t-subhead text-white/85">Étapes, hôtels et programme jour par jour, à partir de tes dates.</p>
        </div>
        <ChevronRight class="w-5 h-5 text-white/80" :stroke-width="2.5" />
      </div>
    </button>
    <div class="list">
      <div class="flex items-center gap-4 px-4 py-3.5">
        <!-- Two concentric rings, like Apple Fitness: done (outer), booked (inner) -->
        <svg viewBox="0 0 36 36" class="w-[58px] h-[58px] -rotate-90 flex-shrink-0" aria-hidden="true">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#34c759" stroke-opacity="0.22" stroke-width="4" />
          <circle v-if="donePct > 0" cx="18" cy="18" r="15.9" fill="none" stroke="#34c759" stroke-width="4" stroke-linecap="round" :stroke-dasharray="dash(donePct)" class="transition-all duration-700" />
          <g transform="translate(18 18) scale(0.66) translate(-18 -18)">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0a84ff" stroke-opacity="0.22" stroke-width="6" />
            <circle v-if="bookedPct > 0" cx="18" cy="18" r="15.9" fill="none" stroke="#0a84ff" stroke-width="6" stroke-linecap="round" :stroke-dasharray="dash(bookedPct)" class="transition-all duration-700" />
          </g>
        </svg>
        <div class="flex-1 grid grid-cols-[1fr_1fr_auto] gap-2">
          <div>
            <p class="t-caption font-semibold uppercase" style="color: var(--vc-green)">Faits</p>
            <p class="text-[19px] font-semibold leading-tight">{{ stats.done }}<span class="t-subhead text-muted font-normal">/{{ stats.total }}</span></p>
          </div>
          <div>
            <p class="t-caption font-semibold uppercase" style="color: var(--vc-primary)">Réservés</p>
            <p class="text-[19px] font-semibold leading-tight">{{ stats.booked }}</p>
          </div>
          <div class="min-w-0">
            <p class="t-caption font-semibold uppercase text-muted">Prévu</p>
            <p class="text-[19px] font-semibold leading-tight whitespace-nowrap" :style="exceeded ? { color: 'var(--vc-red)' } : {}">{{ formatCompact(spent, symbol) }}</p>
          </div>
        </div>
      </div>

      <div v-if="budget" class="px-4 pb-3.5 -mt-1">
        <div class="h-1 rounded-full overflow-hidden" style="background: var(--vc-surface-2)">
          <div class="h-full rounded-full transition-all duration-500" :style="{ width: budgetPct + '%', background: barColor }" />
        </div>
        <p class="t-footnote mt-1.5 flex justify-between gap-2">
          <span :style="exceeded ? { color: 'var(--vc-red)', fontWeight: 600 } : { color: 'var(--vc-muted)' }">
            {{ exceeded ? `Dépassement de ${formatPrice(spent - budget, symbol)}` : `Reste ${formatPrice(budget - spent, symbol)} sur ${formatCompact(budget, symbol)}` }}
          </span>
          <span v-if="stats.wishlistPrice > 0" class="text-muted truncate">+ {{ formatCompact(stats.wishlistPrice, symbol) }} en attente</span>
        </p>
      </div>

      <div>
        <button v-if="!budget && canEdit && openTripEditor" type="button" class="row hairline-t" @click="openTripEditor()">
          <span class="flex-1 t-body text-tint">Définir un budget</span>
        </button>
        <button v-if="canEdit && wishlist > 0" type="button" class="row hairline-t" @click="emit('plan')">
          <span class="row-icon" style="background: var(--vc-ai)"><Sparkles class="w-[17px] h-[17px]" :stroke-width="2" /></span>
          <span class="flex-1 min-w-0">
            <span class="block t-body">Planifier {{ wishlist }} élément{{ wishlist > 1 ? 's' : '' }} sans date</span>
            <span class="block t-footnote text-muted">L’IA les répartit sur ton séjour</span>
          </span>
          <ChevronRight class="w-4 h-4 text-subtle -mr-1" :stroke-width="2.5" />
        </button>
      </div>
    </div>
  </div>
</template>
