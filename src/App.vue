<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const auth = useAuthStore()
const theme = useThemeStore()
const ready = computed(() => auth.ready)
const vantTheme = computed(() => theme.mode === 'dark' ? 'dark' : 'light')
</script>

<template>
  <van-config-provider :theme="vantTheme">
    <van-loading v-if="!ready" class="!fixed !inset-0 !flex !items-center !justify-center" />
    <RouterView v-else v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </van-config-provider>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
