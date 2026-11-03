import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const KEY = 'vacayo:theme'
const media = window.matchMedia?.('(prefers-color-scheme: dark)')

function readPref() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {}
  return 'system'
}

function apply(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--vc-bg').trim()
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || (mode === 'dark' ? '#0b1020' : '#f5f6fa'))
}

export const useThemeStore = defineStore('theme', () => {
  // pref = what the user picked; mode = what is actually displayed
  const pref = ref(readPref())
  const systemDark = ref(!!media?.matches)
  media?.addEventListener?.('change', (e) => { systemDark.value = e.matches })

  const mode = computed(() => pref.value === 'system' ? (systemDark.value ? 'dark' : 'light') : pref.value)

  apply(mode.value)
  watch(mode, apply)
  watch(pref, (p) => { try { localStorage.setItem(KEY, p) } catch {} })

  function toggle() { pref.value = mode.value === 'dark' ? 'light' : 'dark' }
  function set(p) { if (['light', 'dark', 'system'].includes(p)) pref.value = p }

  return { pref, mode, toggle, set }
})
