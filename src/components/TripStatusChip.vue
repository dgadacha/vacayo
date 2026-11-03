<script setup>
import { computed } from 'vue'
import { tripStatus } from '@/utils/helpers'

const props = defineProps({
  trip: { type: Object, required: true },
  overlay: { type: Boolean, default: false }
})

const status = computed(() => tripStatus(props.trip))
const tone = computed(() => {
  if (props.overlay) return 'material !bg-white/25 text-white'
  return {
    upcoming: 'bg-[#007aff]/12 text-[#007aff] dark:bg-[#0a84ff]/20 dark:text-[#409cff]',
    ongoing: 'bg-[#34c759]/15 text-[#248a3d] dark:bg-[#30d158]/20 dark:text-[#30d158]',
    past: 'bg-[#8e8e93]/15 text-[#6c6c70] dark:text-[#aeaeb2]',
    undated: 'bg-[#ff9500]/15 text-[#c93400] dark:text-[#ffb340]'
  }[status.value.state]
})
</script>

<template>
  <span class="chip" :class="tone">
    <span v-if="status.state === 'ongoing'" class="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
    {{ status.label }}
  </span>
</template>
