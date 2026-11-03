import { useActivitiesStore } from '@/stores/activities'
import { useUndo } from '@/composables/useUndo'
import { useToast } from '@/composables/useToast'

// "Plus tard": takes a dated activity or restaurant out of the planning and back to
// the wishlist (no date), with an "Annuler" banner that puts the date back.
// Hotels keep their dates: they define where each night is spent.
export function useLater() {
  const activities = useActivitiesStore()
  const undo = useUndo()
  const toast = useToast()

  const canLater = (a) => !!a && a.type !== 'hotel' && !!a.date

  async function later(a) {
    if (!canLater(a)) return
    const date = a.date
    try {
      await activities.updateActivity(a.id, { date: '' })
      undo.show('Déplacé dans ta liste d’envies', () => activities.updateActivity(a.id, { date }))
    } catch (e) {
      toast.error(e.message || 'Erreur')
    }
  }

  return { canLater, later }
}
