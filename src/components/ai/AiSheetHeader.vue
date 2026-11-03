<script setup>
import { Sparkles } from 'lucide-vue-next'

// iOS sheet header for the AI sheets: grabber, gradient glyph + title, Done.
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  icon: { type: [Object, Function], default: null }
})
defineEmits(['close'])
</script>

<template>
  <header class="flex-shrink-0">
    <div class="grabber" />
    <div class="h-[52px] px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div class="justify-self-start"><slot name="actions" /></div>
      <div class="flex items-center gap-2 min-w-0 max-w-[62vw]">
        <span class="w-6 h-6 rounded-[7px] flex items-center justify-center text-white flex-shrink-0" style="background: var(--vc-ai)">
          <component :is="icon || Sparkles" class="w-[14px] h-[14px]" :stroke-width="2.2" />
        </span>
        <div class="min-w-0 text-left">
          <p class="t-headline leading-tight truncate">{{ title }}</p>
          <p v-if="subtitle" class="t-caption text-muted truncate">{{ subtitle }}</p>
        </div>
      </div>
      <button type="button" class="justify-self-end t-headline text-tint active:opacity-40" @click="$emit('close')">OK</button>
    </div>
  </header>
</template>
