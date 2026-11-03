<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import AiSettingsSheet from '@/components/ai/AiSettingsSheet.vue'
import AppLogo from '@/components/AppLogo.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const ready = computed(() => auth.ready)
const vantTheme = computed(() => theme.mode === 'dark' ? 'dark' : 'light')
</script>

<template>
  <van-config-provider :theme="vantTheme">
    <div v-if="!ready" class="fixed inset-0 flex flex-col items-center justify-center gap-4">
      <AppLogo :size="56" class="rounded-2xl shadow-lift animate-pulse" />
      <van-loading size="20" />
    </div>
    <RouterView v-else v-slot="{ Component }">
      <Transition name="fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
    <AiSettingsSheet />
  </van-config-provider>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
