<script setup>
import { computed } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { LayoutGrid, CheckCircle2, BadgeCheck, Receipt } from 'lucide-vue-next'

const activities = useActivitiesStore()
const stats = computed(() => activities.stats)

const cards = computed(() => [
  { label: 'Items', value: stats.value.total, icon: LayoutGrid, color: 'text-slate-700 dark:text-slate-200' },
  { label: 'Validés', value: `${stats.value.done}/${stats.value.total}`, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Réservés', value: stats.value.booked, icon: BadgeCheck, color: 'text-sky-600 dark:text-sky-400' },
  { label: 'Hôtels', value: stats.value.hotels, icon: Receipt, color: 'text-violet-600 dark:text-violet-400' }
])
</script>

<template>
  <section class="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 mt-3">
    <div v-for="c in cards" :key="c.label" class="card p-3">
      <div class="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
        <component :is="c.icon" class="w-3.5 h-3.5" :stroke-width="2" />
        <p class="text-[11px] font-semibold uppercase tracking-wider">{{ c.label }}</p>
      </div>
      <p class="text-lg sm:text-xl font-bold mt-1 truncate" :class="c.color">{{ c.value }}</p>
    </div>
  </section>
</template>
