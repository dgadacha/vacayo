<script setup>
import { computed } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { LayoutGrid, CheckCircle2, BadgeCheck, BedDouble } from 'lucide-vue-next'

const activities = useActivitiesStore()
const stats = computed(() => activities.stats)

const cards = computed(() => [
  { label: 'Items', value: stats.value.total, icon: LayoutGrid, color: 'text-slate-700 dark:text-slate-200' },
  { label: 'Faits', value: `${stats.value.done}/${stats.value.total}`, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Réservés', value: stats.value.booked, icon: BadgeCheck, color: 'text-sky-600 dark:text-sky-400' },
  { label: 'Hôtels', value: stats.value.hotels, icon: BedDouble, color: 'text-violet-600 dark:text-violet-400' }
])
</script>

<template>
  <van-grid :column-num="4" :border="false" :gutter="8" class="!px-4 !pt-3">
    <van-grid-item v-for="c in cards" :key="c.label" :clickable="false">
      <template #default>
        <div class="card p-3 w-full h-full">
          <div class="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
            <component :is="c.icon" class="w-3.5 h-3.5" :stroke-width="2" />
            <p class="text-[10px] font-semibold uppercase tracking-wider">{{ c.label }}</p>
          </div>
          <p class="text-base sm:text-xl font-bold mt-1 truncate" :class="c.color">{{ c.value }}</p>
        </div>
      </template>
    </van-grid-item>
  </van-grid>
</template>

<style scoped>
:deep(.van-grid-item__content) {
  padding: 0 !important;
  background: transparent !important;
}
:deep(.van-grid-item__content::after) {
  display: none;
}
</style>
