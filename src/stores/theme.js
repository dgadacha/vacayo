import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const KEY = 'vacayo:theme'

function initial() {
  const saved = localStorage.getItem(KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref(initial())
  apply(mode.value)

  watch(mode, (m) => {
    localStorage.setItem(KEY, m)
    apply(m)
  })

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }
  function set(m) { if (m === 'light' || m === 'dark') mode.value = m }

  return { mode, toggle, set }
})
