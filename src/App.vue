<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const theme = useThemeStore()
const ready = computed(() => auth.ready)
const vantTheme = computed(() => theme.mode === 'dark' ? 'dark' : 'light')

// Brand vars override so Vant matches our slate/red palette
const themeVars = {
  primaryColor: '#0f172a',         // slate-900 — our main button color
  primaryColorHover: '#1e293b',    // slate-800
  successColor: '#10b981',         // emerald-500
  dangerColor: '#dc2626',          // red-600 — our brand red
  warningColor: '#f59e0b',         // amber-500
  borderRadius: '12px',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
}
</script>

<template>
  <van-config-provider :theme="vantTheme" :theme-vars="themeVars">
    <div v-if="!ready" class="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 class="w-6 h-6 text-slate-400 animate-spin" :stroke-width="2" />
    </div>
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

/* Tweak Vant defaults to match our look */
.van-popup--round {
  border-top-left-radius: 24px !important;
  border-top-right-radius: 24px !important;
}
.van-popup__close-icon {
  color: rgb(100 116 139) !important;
  top: 14px !important;
  right: 14px !important;
}
.van-toast {
  border-radius: 14px !important;
}
.van-dialog {
  border-radius: 20px !important;
}
.van-nav-bar {
  --van-nav-bar-background: transparent;
}
</style>
