<script setup>
import { useUndo } from '@/composables/useUndo'

// Floating capsule with "Annuler", above the trip tab bar.
const { state, undo } = useUndo()
</script>

<template>
  <div class="fixed inset-x-0 z-[1900] flex justify-center px-3 pointer-events-none" style="bottom: calc(env(safe-area-inset-bottom) + 4.25rem)" role="status" aria-live="polite">
    <Transition name="undo">
      <div v-if="state.message" :key="state.key" class="pointer-events-auto material !rounded-full pl-4 pr-1 py-1 flex items-center gap-2 shadow-lift max-w-full">
        <span class="t-subhead truncate">{{ state.message }}</span>
        <button type="button" class="btn btn-sm btn-plain !px-3" @click="undo">Annuler</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.undo-enter-active, .undo-leave-active { transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }
.undo-enter-from, .undo-leave-to { opacity: 0; transform: translateY(12px) scale(0.96); }
</style>
