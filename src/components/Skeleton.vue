<script setup>
defineProps({
  variant: { type: String, default: 'card' },
  count: { type: Number, default: 3 }
})
</script>

<template>
  <div v-if="variant === 'trip'" class="space-y-3 px-4 pt-3">
    <van-skeleton v-for="i in count" :key="i" :row="3" avatar avatar-shape="square" />
  </div>

  <div v-else-if="variant === 'activity'" class="space-y-3 px-4 pt-3">
    <van-skeleton v-for="i in count" :key="i" :row="3" avatar avatar-shape="square" />
  </div>

  <div v-else-if="variant === 'trip-detail'" class="min-h-screen pt-2">
    <van-skeleton :row="1" row-width="100%" />
    <div class="px-4 mt-3"><van-skeleton :row="2" /></div>
    <div class="px-4 mt-4 space-y-3">
      <van-skeleton v-for="i in 3" :key="i" :row="3" avatar avatar-shape="square" />
    </div>
  </div>

  <van-skeleton v-else :row="count" />
</template>
