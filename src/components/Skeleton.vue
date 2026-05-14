<script setup>
defineProps({
  variant: { type: String, default: 'card' }, // 'card' | 'trip' | 'activity' | 'line' | 'stats' | 'trip-detail'
  count: { type: Number, default: 3 }
})
</script>

<template>
  <div v-if="variant === 'trip'" class="space-y-3">
    <div v-for="i in count" :key="i" class="card overflow-hidden flex">
      <div class="skeleton w-24 sm:w-28 aspect-square flex-shrink-0 !rounded-none" />
      <div class="flex-1 p-3.5 space-y-2">
        <div class="skeleton h-4 w-2/3" />
        <div class="skeleton h-3 w-1/2" />
        <div class="skeleton h-3 w-1/3" />
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'activity'" class="space-y-2.5">
    <div v-for="i in count" :key="i" class="card overflow-hidden flex">
      <div class="skeleton w-24 sm:w-28 aspect-square flex-shrink-0 !rounded-none" />
      <div class="flex-1 p-3 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-2 flex-1">
            <div class="skeleton h-3.5 w-3/4" />
            <div class="skeleton h-3 w-1/2" />
            <div class="skeleton h-3 w-1/3" />
          </div>
          <div class="skeleton w-7 h-7 rounded-full" />
        </div>
        <div class="flex gap-1.5">
          <div class="skeleton h-3 w-12" />
          <div class="skeleton h-3 w-16" />
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'stats'" class="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 mt-3">
    <div v-for="i in 4" :key="i" class="card p-3 space-y-2">
      <div class="skeleton h-3 w-2/3" />
      <div class="skeleton h-6 w-1/2" />
    </div>
  </div>

  <div v-else-if="variant === 'trip-detail'" class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <!-- Header skeleton -->
    <header class="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/70 safe-top">
      <div class="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2">
        <div class="skeleton w-9 h-9 rounded-full" />
        <div class="skeleton w-10 h-10 rounded-xl" />
        <div class="flex-1 space-y-1.5">
          <div class="skeleton h-4 w-32" />
          <div class="skeleton h-3 w-48" />
        </div>
        <div class="skeleton w-9 h-9 rounded-full" />
      </div>
    </header>
    <div class="max-w-2xl mx-auto">
      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 px-4 mt-3">
        <div v-for="i in 4" :key="i" class="card p-3 space-y-2">
          <div class="skeleton h-3 w-2/3" />
          <div class="skeleton h-6 w-1/2" />
        </div>
      </div>
      <!-- Budget card -->
      <div class="card p-4 mx-4 mt-3 space-y-2.5">
        <div class="flex items-center gap-2.5">
          <div class="skeleton w-9 h-9 rounded-xl" />
          <div class="space-y-1.5 flex-1">
            <div class="skeleton h-3 w-24" />
            <div class="skeleton h-5 w-32" />
          </div>
        </div>
      </div>
      <!-- Filter bar -->
      <div class="px-4 mt-3 space-y-2">
        <div class="skeleton h-11 w-full rounded-xl" />
        <div class="flex gap-2">
          <div class="skeleton h-9 flex-1 rounded-xl" />
          <div class="skeleton h-9 flex-1 rounded-xl" />
        </div>
      </div>
      <!-- Cards -->
      <div class="px-4 pt-3 space-y-2.5">
        <div v-for="i in 3" :key="i" class="card overflow-hidden flex">
          <div class="skeleton w-24 sm:w-28 aspect-square flex-shrink-0 !rounded-none" />
          <div class="flex-1 p-3 space-y-2">
            <div class="skeleton h-4 w-3/4" />
            <div class="skeleton h-3 w-1/2" />
            <div class="skeleton h-3 w-1/3" />
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'line'" class="space-y-2">
    <div v-for="i in count" :key="i" class="skeleton h-4 w-full" />
  </div>

  <div v-else class="skeleton h-20 w-full" />
</template>
