<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, default: 'Rien ici' },
  message: { type: String, default: '' }
})
</script>

<template>
  <div class="text-center py-16 px-6">
    <div v-if="icon" class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3">
      <component :is="icon" class="w-7 h-7" :stroke-width="1.5" />
    </div>
    <h3 class="font-semibold text-base">{{ title }}</h3>
    <p v-if="message" class="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">{{ message }}</p>
  </div>
</template>
