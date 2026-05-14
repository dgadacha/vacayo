import { toast } from 'vue-sonner'

export function useToast() {
  return {
    success: (msg, opts) => toast.success(msg, opts),
    error: (msg, opts) => toast.error(msg, opts),
    info: (msg, opts) => toast.info(msg, opts),
    loading: (msg, opts) => toast.loading(msg, opts),
    promise: (p, msgs) => toast.promise(p, msgs),
    dismiss: (id) => toast.dismiss(id)
  }
}
