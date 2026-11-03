import { showToast, showLoadingToast, closeToast } from 'vant'
import 'vant/es/toast/style'

// Compact capsule at the top (styled in style.css), like an iOS system banner.
export function useToast() {
  return {
    success: (msg) => showToast({ message: msg, position: 'top', duration: 1800 }),
    error: (msg) => showToast({ message: msg, position: 'top', duration: 2800, className: 'toast-error' }),
    info: (msg) => showToast({ message: msg, position: 'top', duration: 2200 }),
    loading: (msg) => showLoadingToast({ message: msg || 'Chargement…', forbidClick: true, duration: 0 }),
    dismiss: () => closeToast()
  }
}
