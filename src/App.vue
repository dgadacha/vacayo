<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const theme = useThemeStore()
const ready = computed(() => auth.ready)
const vantTheme = computed(() => theme.mode === 'dark' ? 'dark' : 'light')

// Override Vant CSS vars so the whole UI matches our slate/red palette
const themeVars = {
  primaryColor: '#0f172a',          // slate-900 — main buttons
  primaryColorHover: '#1e293b',     // slate-800
  successColor: '#10b981',          // emerald-500
  dangerColor: '#dc2626',           // red-600 — destructive
  warningColor: '#f59e0b',          // amber-500
  textColor: '#0f172a',
  textColor2: '#475569',
  textColor3: '#94a3b8',
  borderColor: '#e2e8f0',
  backgroundColor: '#f8fafc',
  backgroundColor2: '#ffffff',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  borderRadiusSm: '10px',
  borderRadiusMd: '12px',
  borderRadiusLg: '16px',
  // Field
  cellFontSize: '15px',
  cellHorizontalPadding: '14px',
  cellVerticalPadding: '12px',
  cellGroupInsetPadding: '0 16px',
  cellGroupInsetRadius: '14px',
  fieldLabelWidth: '6.2em',
  fieldLabelColor: '#475569',
  fieldInputTextColor: '#0f172a',
  // Nav bar
  navBarBackground: '#ffffff',
  navBarHeight: '50px',
  navBarTitleFontSize: '16px',
  // Button
  buttonPrimaryBackground: '#0f172a',
  buttonPrimaryBorderColor: '#0f172a',
  // Search
  searchBackground: '#ffffff',
  searchContentBackground: '#f1f5f9',
  // Tabbar
  tabbarHeight: '60px',
  // Toast
  toastBorderRadius: '14px',
  toastBackground: 'rgba(15, 23, 42, 0.95)',
  // Action sheet
  actionSheetItemHeight: '52px',
  actionSheetItemFontSize: '16px'
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

/* Vant overrides to align with the design system */
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
  font-family: Inter, system-ui, sans-serif;
}
.van-dialog {
  border-radius: 20px !important;
}
.van-cell-group--inset {
  margin: 0 16px;
}
.van-nav-bar {
  border-bottom: 1px solid var(--van-border-color);
}
.van-search {
  padding: 8px 16px;
}
.van-tabbar-item__text {
  font-size: 10px !important;
  font-weight: 600 !important;
  letter-spacing: -0.01em;
}
.van-tabbar-item__icon {
  margin-bottom: 2px !important;
}
.van-button {
  font-family: Inter, system-ui, sans-serif;
  font-weight: 600;
}
.van-button--primary {
  font-weight: 600;
}
.van-action-sheet__cancel {
  font-weight: 600;
}
</style>
