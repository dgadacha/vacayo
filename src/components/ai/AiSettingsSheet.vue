<script setup>
import { ref, watch } from 'vue'
import { useAiStore, AI_MODEL } from '@/stores/ai'
import SheetHeader from '@/components/SheetHeader.vue'
import { Sparkles, MessageCircle, Wand2, Lightbulb, CalendarRange, Eye, EyeOff } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const ai = useAiStore()
const toast = useToast()
const draft = ref('')
const reveal = ref(false)

watch(() => ai.showSettings, (open) => {
  if (open) { draft.value = ai.apiKey; reveal.value = false }
})

function save() {
  const k = draft.value.trim()
  if (k && !k.startsWith('sk-ant-')) { toast.error('Une clé Anthropic commence par « sk-ant- »'); return }
  ai.setKey(k)
  ai.showSettings = false
  toast.success(k ? 'Assistant IA activé' : 'Clé supprimée')
}
function remove() {
  ai.setKey('')
  draft.value = ''
  toast.info('Clé supprimée de cet appareil')
}

const FEATURES = [
  { icon: MessageCircle, title: 'Copilote', text: 'Pose tes questions sur le voyage.' },
  { icon: Wand2, title: 'Ajout magique', text: 'Colle un mail de réservation, les fiches se remplissent.' },
  { icon: Lightbulb, title: 'Idées', text: 'Des lieux adaptés à tes étapes.' },
  { icon: CalendarRange, title: 'Planification', text: 'Ta liste d’envies répartie sur le séjour.' }
]
</script>

<template>
  <van-popup v-model:show="ai.showSettings" position="bottom" round teleport="body" :style="{ maxHeight: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }">
    <div class="overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" :style="{ maxHeight: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }">
      <SheetHeader
        title="Assistant IA"
        :cancel-label="ai.viaProxy ? '' : 'Annuler'"
        :action-label="ai.viaProxy ? 'OK' : 'Enregistrer'"
        @cancel="ai.showSettings = false"
        @action="ai.viaProxy ? (ai.showSettings = false) : save()"
      />

      <div class="text-center px-8 pt-3">
        <div class="inline-flex w-16 h-16 rounded-[18px] items-center justify-center text-white" style="background: var(--vc-ai)">
          <Sparkles class="w-8 h-8" :stroke-width="1.8" />
        </div>
        <h2 class="t-title2 mt-3">Assistant IA</h2>
        <p class="t-subhead text-muted mt-1">Propulsé par Claude Haiku · <span class="t-caption">{{ AI_MODEL }}</span></p>
      </div>

      <div class="list mt-6" style="--sep-inset: 57px">
        <div v-for="f in FEATURES" :key="f.title" class="row">
          <span class="row-icon" style="background: var(--vc-ai)"><component :is="f.icon" class="w-[17px] h-[17px]" :stroke-width="2" /></span>
          <span class="min-w-0">
            <span class="block t-body">{{ f.title }}</span>
            <span class="block t-footnote text-muted">{{ f.text }}</span>
          </span>
        </div>
      </div>

      <template v-if="ai.viaProxy">
        <div class="list mt-7">
          <div class="row">
            <span class="t-body flex-1">Statut</span>
            <span class="t-body" style="color: var(--vc-green)">Activé</span>
          </div>
        </div>
        <p class="list-footer">Fourni par le serveur Vacayo : rien à configurer, il suffit d’être connecté.</p>
      </template>

      <template v-else>
        <h3 class="list-header mt-7">Clé API Anthropic</h3>
        <div class="list">
          <label class="row">
            <input
              id="ai-key"
              v-model="draft"
              :type="reveal ? 'text' : 'password'"
              placeholder="sk-ant-…"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              class="flex-1 min-w-0 bg-transparent outline-none text-[17px] font-mono"
            />
            <button type="button" class="text-subtle -mr-1" :aria-label="reveal ? 'Masquer la clé' : 'Afficher la clé'" @click="reveal = !reveal">
              <EyeOff v-if="reveal" class="w-5 h-5" :stroke-width="2" />
              <Eye v-else class="w-5 h-5" :stroke-width="2" />
            </button>
          </label>
        </div>
        <p class="list-footer">
          Crée une clé sur <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" class="text-tint">console.anthropic.com</a>. Elle reste uniquement sur cet appareil.
        </p>
        <div v-if="ai.apiKey" class="list mt-7">
          <button type="button" class="row justify-center t-body" style="color: var(--vc-red)" @click="remove">Supprimer la clé</button>
        </div>
      </template>

      <p class="list-footer mt-6">Quand tu utilises une fonction IA, les infos du voyage (noms, villes, dates, prix, notes) sont envoyées à Anthropic.</p>
    </div>
  </van-popup>
</template>
