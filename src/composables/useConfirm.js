import { showConfirmDialog } from 'vant'
import 'vant/es/dialog/style'

export function useConfirm() {
  async function confirm(opts = {}) {
    try {
      await showConfirmDialog({
        title: opts.title || 'Confirmer',
        message: opts.message,
        confirmButtonText: opts.confirmLabel || 'Confirmer',
        cancelButtonText: opts.cancelLabel || 'Annuler',
        confirmButtonColor: opts.destructive ? '#dc2626' : '#0f172a',
        closeOnPopstate: true,
        showCancelButton: true,
        teleport: 'body'
      })
      return true
    } catch {
      return false
    }
  }
  return { confirm }
}
