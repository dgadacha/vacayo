import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const KEY = 'vacayo:ai:key'

export const AI_MODEL = 'claude-haiku-5-5'

// With VITE_AI_PROXY_URL the key lives server-side (ai-proxy/); otherwise each
// user pastes their own Anthropic key, stored only in this browser.
export const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || ''

function readKey() {
  try { return localStorage.getItem(KEY) || '' } catch { return '' }
}

export const useAiStore = defineStore('ai', () => {
  const apiKey = ref(readKey())
  const showSettings = ref(false)

  const viaProxy = !!AI_PROXY_URL
  const ready = computed(() => viaProxy || !!apiKey.value)

  function setKey(k) {
    apiKey.value = (k || '').trim()
    try {
      if (apiKey.value) localStorage.setItem(KEY, apiKey.value)
      else localStorage.removeItem(KEY)
    } catch {}
  }

  // Call before any AI action: opens the settings sheet when AI isn't set up yet.
  function requireReady() {
    if (ready.value) return true
    showSettings.value = true
    return false
  }

  return { apiKey, showSettings, viaProxy, ready, setKey, requireReady }
})
