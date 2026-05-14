<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, default: 'Rien ici' },
  message: { type: String, default: '' }
})
</script>

<template>
  <van-empty :description="title">
    <template v-if="icon" #image>
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
        <component :is="icon" class="w-8 h-8" :stroke-width="1.5" />
      </div>
    </template>
    <template v-if="message" #description>
      <div class="text-center">
        <p class="font-semibold text-base">{{ title }}</p>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">{{ message }}</p>
      </div>
    </template>
  </van-empty>
</template>
