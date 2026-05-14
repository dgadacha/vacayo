import { showToast, showSuccessToast, showFailToast, showLoadingToast, closeToast } from 'vant'
import 'vant/es/toast/style'

export function useToast() {
  return {
    success: (msg) => showSuccessToast({ message: msg, position: 'top', duration: 2000 }),
    error: (msg) => showFailToast({ message: msg, position: 'top', duration: 2500 }),
    info: (msg) => showToast({ message: msg, position: 'top', duration: 2000 }),
    loading: (msg) => showLoadingToast({ message: msg || 'Chargement…', forbidClick: true, duration: 0 }),
    dismiss: () => closeToast()
  }
}
