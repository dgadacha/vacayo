<script setup>
import { useConfirmState } from '@/composables/useConfirm'
import { AlertTriangle, HelpCircle, X } from 'lucide-vue-next'

const { state, handle } = useConfirmState()
</script>

<template>
  <Transition name="dialog">
    <div v-if="state.open" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="handle(false)" />
      <div class="relative w-full max-w-sm card p-5 animate-slide-up">
        <div class="flex items-start gap-3">
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            :class="state.destructive
              ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'"
          >
            <AlertTriangle v-if="state.destructive" class="w-5 h-5" :stroke-width="2" />
            <HelpCircle v-else class="w-5 h-5" :stroke-width="2" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-base tracking-tight">{{ state.title }}</h3>
            <p v-if="state.message" class="mt-1 text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">{{ state.message }}</p>
          </div>
          <button @click="handle(false)" class="btn-icon -mr-1 -mt-1" aria-label="Fermer">
            <X class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="handle(false)" class="btn-secondary flex-1">{{ state.cancelLabel }}</button>
          <button
            @click="handle(true)"
            :class="state.destructive
              ? 'btn flex-1 bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20'
              : 'btn-primary flex-1'"
          >
            {{ state.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dialog-enter-active, .dialog-leave-active { transition: opacity 0.2s ease; }
.dialog-enter-from, .dialog-leave-to { opacity: 0; }
</style>
