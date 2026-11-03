<script setup>
// iOS sheet header: grabber, then Cancel · Title · Action (any side can be omitted).
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  cancelLabel: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  actionDisabled: { type: Boolean, default: false },
  actionLoading: { type: Boolean, default: false }
})
defineEmits(['cancel', 'action'])
</script>

<template>
  <header class="flex-shrink-0 sticky top-0 z-10" style="background: inherit">
    <div class="grabber" />
    <div class="h-[50px] px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div class="justify-self-start">
        <slot name="left">
          <button v-if="cancelLabel" type="button" class="t-body text-tint active:opacity-40" @click="$emit('cancel')">{{ cancelLabel }}</button>
        </slot>
      </div>
      <div class="text-center min-w-0 max-w-[60vw]">
        <slot name="title">
          <p class="t-headline truncate">{{ title }}</p>
          <p v-if="subtitle" class="t-caption text-muted truncate">{{ subtitle }}</p>
        </slot>
      </div>
      <div class="justify-self-end">
        <slot name="right">
          <button v-if="actionLabel" type="button" class="t-headline text-tint active:opacity-40 disabled:opacity-30" :disabled="actionDisabled || actionLoading" @click="$emit('action')">
            <van-loading v-if="actionLoading" size="18" />
            <template v-else>{{ actionLabel }}</template>
          </button>
        </slot>
      </div>
    </div>
  </header>
</template>
