<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Toaster } from 'vue-sonner'
import { Loader2 } from 'lucide-vue-next'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const auth = useAuthStore()
const theme = useThemeStore()
const ready = computed(() => auth.ready)
const toasterTheme = computed(() => theme.mode)
</script>

<template>
  <div v-if="!ready" class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <Loader2 class="w-6 h-6 text-slate-400 animate-spin" :stroke-width="2" />
  </div>
  <RouterView v-else v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
  <Toaster :theme="toasterTheme" position="top-center" rich-colors close-button />
  <ConfirmDialog />
</template>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
