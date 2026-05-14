<script setup>
defineProps({
  variant: { type: String, default: 'card' },
  count: { type: Number, default: 3 }
})
</script>

<template>
  <div v-if="variant === 'trip'" class="space-y-3 px-4">
    <div v-for="i in count" :key="i" class="card overflow-hidden flex p-3 gap-3">
      <van-skeleton-image class="!w-20 !h-20 !rounded-xl" />
      <div class="flex-1 py-1">
        <van-skeleton :row="3" row-width="60%" />
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'activity'" class="space-y-2.5 px-4">
    <div v-for="i in count" :key="i" class="card overflow-hidden flex p-3 gap-3">
      <van-skeleton-image class="!w-20 !h-20 !rounded-xl" />
      <div class="flex-1 py-1">
        <van-skeleton :row="3" row-width="75%" />
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'trip-detail'" class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <van-skeleton :row="1" row-width="100%" class="!py-3" />
    <div class="grid grid-cols-4 gap-2 px-4 mt-3">
      <div v-for="i in 4" :key="i" class="card p-3">
        <van-skeleton :row="2" row-width="60%" />
      </div>
    </div>
    <div class="card p-4 mx-4 mt-3">
      <van-skeleton :row="2" row-width="50%" />
    </div>
    <div class="px-4 mt-4 space-y-2.5">
      <div v-for="i in 3" :key="i" class="card p-3 flex gap-3">
        <van-skeleton-image class="!w-20 !h-20 !rounded-xl" />
        <div class="flex-1"><van-skeleton :row="3" /></div>
      </div>
    </div>
  </div>

  <van-skeleton v-else :row="count" />
</template>
