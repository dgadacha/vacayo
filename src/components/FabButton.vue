<script setup>
import { Plus } from 'lucide-vue-next'

defineProps({
  label: { type: String, required: true },
  // distance from the bottom edge, above the safe area (e.g. to clear a tab bar)
  offset: { type: String, default: '1.5rem' }
})
defineEmits(['click'])
</script>

<template>
  <Teleport to="body">
    <button
      type="button"
      class="fab btn-primary fixed z-30 right-5 w-14 h-14 rounded-full flex items-center justify-center transition active:scale-95"
      :style="{ bottom: `calc(env(safe-area-inset-bottom) + ${offset})` }"
      :aria-label="label"
      :title="label"
      @click="$emit('click')"
    >
      <Plus class="w-6 h-6" :stroke-width="2.5" />
    </button>
  </Teleport>
</template>

<style scoped>
.fab { box-shadow: 0 10px 24px rgb(79 70 229 / 0.35); }
</style>
