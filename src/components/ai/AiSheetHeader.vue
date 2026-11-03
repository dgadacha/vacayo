<script setup>
import { Sparkles, X } from 'lucide-vue-next'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null }
})
defineEmits(['close'])
</script>

<template>
  <header class="flex items-center gap-3 px-4 h-16 flex-shrink-0 border-b" style="border-color: var(--vc-border-soft)">
    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0" style="background: var(--vc-ai)">
      <component :is="icon || Sparkles" class="w-[18px] h-[18px]" :stroke-width="2" />
    </div>
    <div class="flex-1 min-w-0">
      <h2 class="font-bold text-[15px] leading-tight truncate">{{ title }}</h2>
      <p v-if="subtitle" class="text-xs text-muted truncate">{{ subtitle }}</p>
    </div>
    <slot name="actions" />
    <button type="button" class="btn-icon" aria-label="Fermer" @click="$emit('close')">
      <X class="w-5 h-5" :stroke-width="2" />
    </button>
  </header>
</template>
