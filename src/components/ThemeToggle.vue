<script setup>
import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { Sun, Moon } from 'lucide-vue-next'

const theme = useThemeStore()
const isDark = computed(() => theme.mode === 'dark')
const label = computed(() => isDark.value ? 'Passer en mode clair' : 'Passer en mode sombre')
</script>

<template>
  <button @click="theme.toggle()" class="btn-icon" :aria-label="label" :title="label">
    <Moon v-if="!isDark" class="w-5 h-5" :stroke-width="2" />
    <Sun v-else class="w-5 h-5" :stroke-width="2" />
  </button>
</template>
