<script setup>
import { computed } from 'vue'
import { tripStatus } from '@/utils/helpers'

const props = defineProps({
  trip: { type: Object, required: true },
  overlay: { type: Boolean, default: false }
})

const status = computed(() => tripStatus(props.trip))
const tone = computed(() => {
  if (props.overlay) return 'bg-white/20 text-white ring-white/30 backdrop-blur'
  return {
    upcoming: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-500/30',
    ongoing: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
    past: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-400 dark:ring-slate-500/30',
    undated: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30'
  }[status.value.state]
})
</script>

<template>
  <span class="chip" :class="tone">
    <span v-if="status.state === 'ongoing'" class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
    {{ status.label }}
  </span>
</template>
