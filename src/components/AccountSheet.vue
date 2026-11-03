<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useAiStore } from '@/stores/ai'
import { useConfirm } from '@/composables/useConfirm'
import SheetHeader from '@/components/SheetHeader.vue'
import { Sparkles, Download, ChevronRight, Sun, Moon, SunMoon, GraduationCap } from 'lucide-vue-next'

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
  { value: 'system', label: 'Auto', icon: SunMoon }
]

function close() { emit('update:modelValue', false) }
function openAi() { close(); ai.showSettings = true }
function openImport() { close(); emit('import') }
function openTutorial() { close(); auth.replayTutorial() }
async function logout() {
  const ok = await confirm({ title: 'Se déconnecter ?', message: 'Tes voyages restent enregistrés dans ton compte.', confirmLabel: 'Se déconnecter', destructive: true })
  if (!ok) return
  close()
  await auth.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <van-popup :show="modelValue" position="bottom" round teleport="body" :style="{ maxHeight: '94vh', background: 'var(--vc-bg)' }" @update:show="emit('update:modelValue', $event)">
    <div class="overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" :style="{ maxHeight: '94vh', background: 'var(--vc-bg)' }">
      <SheetHeader title="Compte" action-label="OK" @action="close" />

      <!-- Profile card, like the Apple Account row in Settings -->
      <div class="list mt-2">
        <div class="row !py-3">
          <div class="w-[60px] h-[60px] rounded-full flex items-center justify-center text-white text-[26px] font-semibold bg-gradient-to-b from-[#a1a1a6] to-[#7c7c80] flex-shrink-0">{{ initial }}</div>
          <div class="min-w-0">
            <p class="t-title3 truncate">{{ auth.user?.name }}</p>
            <p class="t-subhead text-muted truncate">{{ auth.user?.email }}</p>
          </div>
        </div>
      </div>

      <h3 class="list-header mt-8">Apparence</h3>
      <div class="list p-4">
        <div class="segmented">
          <button v-for="t in THEMES" :key="t.value" type="button" :aria-pressed="theme.pref === t.value" @click="theme.set(t.value)">
            <component :is="t.icon" class="w-3.5 h-3.5" :stroke-width="2" />{{ t.label }}
          </button>
        </div>
      </div>

      <div class="list mt-8" style="--sep-inset: 57px">
        <button type="button" class="row" @click="openAi">
          <span class="row-icon" style="background: var(--vc-ai)"><Sparkles class="w-[17px] h-[17px]" :stroke-width="2" /></span>
          <span class="flex-1 t-body">Assistant IA</span>
          <span class="t-body text-muted">{{ ai.ready ? 'Activé' : 'Désactivé' }}</span>
          <ChevronRight class="w-4 h-4 text-subtle -mr-1" :stroke-width="2.5" />
        </button>
        <button type="button" class="row" @click="openTutorial">
          <span class="row-icon bg-[#ff9500]"><GraduationCap class="w-[17px] h-[17px]" :stroke-width="2" /></span>
          <span class="flex-1 t-body">Revoir le tutoriel</span>
          <ChevronRight class="w-4 h-4 text-subtle -mr-1" :stroke-width="2.5" />
        </button>
        <button type="button" class="row" @click="openImport">
          <span class="row-icon bg-[#34c759]"><Download class="w-[17px] h-[17px]" :stroke-width="2.2" /></span>
          <span class="flex-1 t-body">Importer un voyage</span>
          <ChevronRight class="w-4 h-4 text-subtle -mr-1" :stroke-width="2.5" />
        </button>
      </div>
      <p class="list-footer">Fichier JSON exporté depuis Vacayo.</p>

      <div class="list mt-8">
        <button type="button" class="row justify-center t-body" style="color: var(--vc-red)" @click="logout">Se déconnecter</button>
      </div>
    </div>
  </van-popup>
</template>
