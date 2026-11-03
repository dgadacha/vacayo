<script setup>
defineProps({ size: { type: Number, default: 40 } })
const id = `vlogo-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient :id="id" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6366f1" />
        <stop offset="1" stop-color="#c026d3" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" :fill="`url(#${id})`" />
    <path d="M9 10.5l7 12 7-12" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
