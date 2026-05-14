<script setup>
import { computed } from 'vue'
import { useActivitiesStore } from '@/stores/activities'

const activities = useActivitiesStore()
const stats = computed(() => activities.stats)

const cards = computed(() => [
  { label: 'Items', value: stats.value.total, icon: 'apps-o' },
  { label: 'Faits', value: `${stats.value.done}/${stats.value.total}`, icon: 'success' },
  { label: 'Réservés', value: stats.value.booked, icon: 'passed' },
  { label: 'Hôtels', value: stats.value.hotels, icon: 'hotel-o' }
])
</script>

<template>
  <van-grid :column-num="4" :border="false" square>
    <van-grid-item v-for="c in cards" :key="c.label" :icon="c.icon" :text="`${c.value} ${c.label}`">
      <template #text>
        <div class="text-center">
          <div class="text-base font-bold">{{ c.value }}</div>
          <div class="text-[10px] opacity-60">{{ c.label }}</div>
        </div>
      </template>
    </van-grid-item>
  </van-grid>
</template>
