import { ref, reactive } from 'vue'

const state = reactive({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  destructive: false,
  resolve: null
})

export function useConfirm() {
  function confirm(opts = {}) {
    return new Promise((resolve) => {
      state.title = opts.title || 'Confirmer'
      state.message = opts.message || ''
      state.confirmLabel = opts.confirmLabel || 'Confirmer'
      state.cancelLabel = opts.cancelLabel || 'Annuler'
      state.destructive = !!opts.destructive
      state.resolve = resolve
      state.open = true
    })
  }
  return { confirm }
}

export function useConfirmState() {
  function handle(value) {
    state.open = false
    state.resolve?.(value)
    state.resolve = null
  }
  return { state, handle }
}
