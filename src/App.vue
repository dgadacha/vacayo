<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AiSettingsSheet from '@/components/ai/AiSettingsSheet.vue'
import AppLogo from '@/components/AppLogo.vue'
import TutorialSheet from '@/components/TutorialSheet.vue'

const auth = useAuthStore()
const route = useRoute()
const ready = computed(() => auth.ready)
</script>

<template>
  <!-- Light only, whatever the phone's setting -->
  <van-config-provider theme="light">
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
    <TutorialSheet v-if="ready && route.name !== 'login'" />
  </van-config-provider>
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
