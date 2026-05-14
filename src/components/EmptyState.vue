<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, default: 'Rien ici' },
  message: { type: String, default: '' }
})
</script>

<template>
  <van-empty :description="message || title">
    <template v-if="icon" #image>
      <component :is="icon" class="w-12 h-12 opacity-50" :stroke-width="1.5" />
    </template>
  </van-empty>
</template>
