<script setup>
import { computed, inject, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { formatPrice } from '@/utils/helpers'

const activities = useActivitiesStore()
const trip = inject('trip', ref(null))
const canEdit = inject('canEdit', ref(false))
const openTripEditor = inject('openTripEditor', null)

const symbol = computed(() => trip.value?.currencySymbol || '€')
const budget = computed(() => Number(trip.value?.budget) || 0)
const spent = computed(() => activities.stats.totalPrice)
const scheduledCount = computed(() => activities.stats.scheduledCount)
const wishlistPrice = computed(() => activities.stats.wishlistPrice)
const hasBudget = computed(() => budget.value > 0)

const percent = computed(() => hasBudget.value ? Math.min(100, (spent.value / budget.value) * 100) : 0)
const exceeded = computed(() => hasBudget.value && spent.value > budget.value)
const remaining = computed(() => budget.value - spent.value)

const progressColor = computed(() => {
  if (exceeded.value) return '#ee0a24'
  if (percent.value >= 85) return '#ff976a'
  return '#07c160'
})
</script>

<template>
  <van-cell-group inset style="margin-top: 12px;">
    <template v-if="!hasBudget">
      <van-cell title="Coût du voyage" :label="`${scheduledCount} planifié${scheduledCount > 1 ? 's' : ''}${wishlistPrice > 0 ? ' · ' + formatPrice(wishlistPrice, symbol) + ' wishlist' : ''}`" center>
        <template #icon>
          <van-icon name="balance-o" size="22" style="margin-right: 10px;" />
        </template>
        <template #default>
          <span class="text-base font-bold">{{ formatPrice(spent, symbol) }}</span>
        </template>
        <template v-if="canEdit && openTripEditor" #right-icon>
          <van-button size="mini" plain round @click="openTripEditor()" icon="plus" style="margin-left: 8px;">
            Budget
          </van-button>
        </template>
      </van-cell>
    </template>

    <template v-else>
      <van-cell title="Budget" center>
        <template #icon>
          <van-icon name="balance-o" size="22" style="margin-right: 10px;" />
        </template>
        <template #default>
          <div class="text-right">
            <div class="text-base font-bold">{{ formatPrice(spent, symbol) }} <span class="text-xs font-normal opacity-60">/ {{ formatPrice(budget, symbol) }}</span></div>
          </div>
        </template>
      </van-cell>
      <van-cell>
        <template #default>
          <van-progress
            :percentage="percent"
            :color="progressColor"
            :show-pivot="false"
            stroke-width="6"
          />
          <div class="flex items-center justify-between mt-1.5 text-xs">
            <span :style="exceeded ? { color: '#ee0a24', fontWeight: 600 } : { opacity: 0.7 }">
              <template v-if="exceeded">Dépassement de {{ formatPrice(spent - budget, symbol) }}</template>
              <template v-else>Reste {{ formatPrice(remaining, symbol) }}</template>
            </span>
            <span class="opacity-50">
              {{ scheduledCount }} planifié{{ scheduledCount > 1 ? 's' : '' }}<span v-if="wishlistPrice > 0"> · {{ formatPrice(wishlistPrice, symbol) }} wishlist</span>
            </span>
          </div>
        </template>
      </van-cell>
    </template>
  </van-cell-group>
</template>
