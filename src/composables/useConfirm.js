import { showConfirmDialog } from 'vant'
import 'vant/es/dialog/style'

// iOS alert: Cancel on the left, the action on the right (red when destructive).
export function useConfirm() {
  async function confirm(opts = {}) {
    try {
      await showConfirmDialog({
        title: opts.title || 'Confirmer',
        message: opts.message,
        confirmButtonText: opts.confirmLabel || 'OK',
        cancelButtonText: opts.cancelLabel || 'Annuler',
        confirmButtonColor: opts.destructive ? 'var(--vc-red)' : 'var(--vc-primary)',
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
