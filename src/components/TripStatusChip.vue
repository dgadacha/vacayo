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
    upcoming: 'bg-[#007aff]/12 text-[#007aff]',
    ongoing: 'bg-[#34c759]/15 text-[#248a3d]',
    past: 'bg-[#8e8e93]/15 text-[#6c6c70]',
    undated: 'bg-[#ff9500]/15 text-[#c93400]'
  }[status.value.state]
})
</script>

<template>
  <span class="chip" :class="tone">
    <span v-if="status.state === 'ongoing'" class="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" />
    {{ status.label }}
  </span>
</template>
