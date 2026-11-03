<script setup>
import { ref, watch } from 'vue'
import { useAiStore, AI_MODEL } from '@/stores/ai'
import { Sparkles, KeyRound, ShieldCheck, Eye, EyeOff, Server } from 'lucide-vue-next'
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
  toast.success(k ? 'IA activée' : 'Clé supprimée')
}
function remove() {
  ai.setKey('')
  draft.value = ''
  toast.info('Clé supprimée de cet appareil')
}

const FEATURES = [
  'Copilote : pose tes questions sur le voyage',
  'Ajout magique : colle un mail de réservation',
  'Idées de lieux adaptées à tes étapes',
  'Planification auto de ta wishlist'
]
</script>

<template>
  <van-popup v-model:show="ai.showSettings" position="bottom" round safe-area-inset-bottom teleport="body" :style="{ maxHeight: '92vh' }">
    <div class="overflow-y-auto px-5 pt-6 pb-4" :style="{ maxHeight: '92vh' }">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white" style="background: var(--vc-ai)">
          <Sparkles class="w-5 h-5" :stroke-width="2" />
        </div>
        <div>
          <h2 class="text-lg font-bold leading-tight">Assistant IA</h2>
          <p class="text-xs text-muted">Propulsé par Claude Haiku · <code class="text-[10px]">{{ AI_MODEL }}</code></p>
        </div>
      </div>

      <ul class="mt-5 space-y-2">
        <li v-for="f in FEATURES" :key="f" class="flex items-start gap-2 text-sm">
          <span class="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: var(--vc-primary)" />
          {{ f }}
        </li>
      </ul>

      <div v-if="ai.viaProxy" class="mt-5 card p-4 flex gap-3 items-start">
        <Server class="w-5 h-5 flex-shrink-0 mt-0.5" style="color: var(--vc-primary)" :stroke-width="2" />
        <p class="text-sm">L'IA est fournie par le serveur Vacayo : rien à configurer, il suffit d'être connecté.</p>
      </div>

      <template v-else>
        <label class="block mt-6 section-label" for="ai-key">Ta clé API Anthropic</label>
        <div class="mt-2 flex items-center gap-2 rounded-xl px-3 h-12 surface-2">
          <KeyRound class="w-4 h-4 text-muted flex-shrink-0" :stroke-width="2" />
          <input
            id="ai-key"
            v-model="draft"
            :type="reveal ? 'text' : 'password'"
            placeholder="sk-ant-…"
            autocomplete="off"
            spellcheck="false"
            class="flex-1 min-w-0 bg-transparent outline-none text-sm font-mono"
          />
          <button type="button" class="btn-icon !w-8 !h-8" :aria-label="reveal ? 'Masquer la clé' : 'Afficher la clé'" @click="reveal = !reveal">
            <EyeOff v-if="reveal" class="w-4 h-4" :stroke-width="2" />
            <Eye v-else class="w-4 h-4" :stroke-width="2" />
          </button>
        </div>
        <p class="mt-2 text-xs text-muted">
          Crée une clé sur
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" class="underline font-medium" style="color: var(--vc-primary)">console.anthropic.com</a>.
          Haiku coûte une fraction de centime par requête.
        </p>
      </template>

      <div class="mt-5 flex gap-3 items-start text-xs text-muted">
        <ShieldCheck class="w-4 h-4 flex-shrink-0 mt-0.5" :stroke-width="2" />
        <p>
          Quand tu utilises une fonction IA, les infos du voyage (noms, villes, dates, prix, notes) sont envoyées à Anthropic.
          <template v-if="!ai.viaProxy"> Ta clé reste uniquement sur cet appareil.</template>
        </p>
      </div>

      <div class="mt-6 flex gap-2">
        <button v-if="!ai.viaProxy && ai.apiKey" type="button" class="btn btn-secondary" @click="remove">Supprimer</button>
        <button v-if="!ai.viaProxy" type="button" class="btn btn-primary flex-1" @click="save">Enregistrer</button>
        <button v-else type="button" class="btn btn-primary flex-1" @click="ai.showSettings = false">Compris</button>
      </div>
    </div>
  </van-popup>
</template>
