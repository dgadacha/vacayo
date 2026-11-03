<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useAiStore } from '@/stores/ai'
import { useConfirm } from '@/composables/useConfirm'
import { Sparkles, Upload, LogOut, ChevronRight, Sun, Moon, MonitorSmartphone } from 'lucide-vue-next'

defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'import'])

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const ai = useAiStore()
const { confirm } = useConfirm()

const initial = computed(() => (auth.user?.name || '?').charAt(0).toUpperCase())
const THEMES = [
  { value: 'light', label: 'Clair', icon: Sun },
  { value: 'dark', label: 'Sombre', icon: Moon },
  { value: 'system', label: 'Auto', icon: MonitorSmartphone }
]

function close() { emit('update:modelValue', false) }
function openAi() { close(); ai.showSettings = true }
function openImport() { close(); emit('import') }
async function logout() {
  const ok = await confirm({ title: 'Se déconnecter ?', confirmLabel: 'Déconnexion' })
  if (!ok) return
  close()
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <van-popup :show="modelValue" position="bottom" round safe-area-inset-bottom teleport="body" @update:show="emit('update:modelValue', $event)">
    <div class="px-5 pt-6 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold" style="background: var(--vc-ai)">{{ initial }}</div>
        <div class="min-w-0">
          <p class="font-bold text-base truncate">{{ auth.user?.name }}</p>
          <p class="text-sm text-muted truncate">{{ auth.user?.email }}</p>
        </div>
      </div>

      <p class="section-label mt-6 mb-2">Apparence</p>
      <div class="segmented">
        <button v-for="t in THEMES" :key="t.value" type="button" :aria-pressed="theme.pref === t.value" class="inline-flex items-center justify-center gap-1.5" @click="theme.set(t.value)">
          <component :is="t.icon" class="w-3.5 h-3.5" :stroke-width="2" />{{ t.label }}
        </button>
      </div>

      <div class="card mt-5 overflow-hidden divide-y" style="--tw-divide-opacity: 1; border-color: var(--vc-border-soft)">
        <button type="button" class="row" @click="openAi">
          <span class="row-icon text-white" style="background: var(--vc-ai)"><Sparkles class="w-4 h-4" :stroke-width="2" /></span>
          <span class="flex-1 text-left">
            <span class="block font-semibold text-sm">Assistant IA</span>
            <span class="block text-xs text-muted">{{ ai.ready ? 'Activé · Claude Haiku' : 'À configurer' }}</span>
          </span>
          <ChevronRight class="w-4 h-4 text-subtle" :stroke-width="2" />
        </button>
        <button type="button" class="row" @click="openImport">
          <span class="row-icon surface-2"><Upload class="w-4 h-4" :stroke-width="2" /></span>
          <span class="flex-1 text-left">
            <span class="block font-semibold text-sm">Importer un voyage</span>
            <span class="block text-xs text-muted">Fichier JSON exporté de Vacayo</span>
          </span>
          <ChevronRight class="w-4 h-4 text-subtle" :stroke-width="2" />
        </button>
        <button type="button" class="row text-rose-600 dark:text-rose-400" @click="logout">
          <span class="row-icon bg-rose-50 dark:bg-rose-500/15"><LogOut class="w-4 h-4" :stroke-width="2" /></span>
          <span class="flex-1 text-left font-semibold text-sm">Se déconnecter</span>
        </button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.row { @apply w-full flex items-center gap-3 px-4 py-3 transition; border-color: var(--vc-border-soft); }
.row:active { background: var(--vc-surface-2); }
.row-icon { @apply w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0; }
</style>
