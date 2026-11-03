import { reactive } from 'vue'
import { useToast } from '@/composables/useToast'

// One "Annuler" banner at a time above the tab bar (UndoBar.vue), like Mail or Photos.
const state = reactive({ message: '', onUndo: null, key: 0 })
let timer = null

function hide() {
  clearTimeout(timer)
  state.message = ''
  state.onUndo = null
}

export function useUndo() {
  const toast = useToast()

  function show(message, onUndo, duration = 6000) {
    clearTimeout(timer)
    Object.assign(state, { message, onUndo, key: state.key + 1 })
    timer = setTimeout(hide, duration)
  }

  async function undo() {
    const fn = state.onUndo
    hide()
    try { await fn?.() }
    catch (e) { toast.error(e.message || 'Impossible d’annuler') }
  }

  return { state, show, hide, undo }
}
