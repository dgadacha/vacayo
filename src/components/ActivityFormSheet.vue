<script setup>
import { ref, watch, computed, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { X, Save, MapPin, Tag, Calendar, Wallet, Link2, Image, BadgeCheck, Loader2 } from 'lucide-vue-next'

const trip = inject('trip', ref(null))
const symbol = computed(() => trip.value?.currencySymbol || '€')

const props = defineProps({
  modelValue: Boolean,
  activity: { type: Object, default: null },
  defaultType: { type: String, default: 'activity' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const activities = useActivitiesStore()
const isEdit = computed(() => !!props.activity?.id)
const saving = ref(false)
const error = ref('')

const form = ref(emptyForm())

function emptyForm() {
  return {
    type: props.defaultType,
    name: '',
    city: '',
    category: '',
    price: 0,
    date: '',
    endDate: '',
    notes: '',
    photoUrl: '',
    bookingUrl: '',
    googleMapsUrl: '',
    priority: 'normal',
    isBooked: false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    error.value = ''
    form.value = props.activity ? { ...emptyForm(), ...props.activity } : { ...emptyForm(), type: props.defaultType }
  }
})

function close() { if (!saving.value) emit('update:modelValue', false) }

async function submit() {
  if (!form.value.name?.trim() || saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (isEdit.value) await activities.updateActivity(props.activity.id, form.value)
    else await activities.addActivity(form.value)
    emit('saved')
    emit('update:modelValue', false)
  } catch (e) {
    error.value = e.message || 'Erreur lors de l\'enregistrement'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Transition name="sheet">
    <div v-if="modelValue" class="fixed inset-0 z-40">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="close" />
      <form
        @submit.prevent="submit"
        class="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
      >
        <div class="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto animate-slide-up">
          <div class="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between rounded-t-3xl z-10">
            <button type="button" @click="close" class="btn-icon -ml-1">
              <X class="w-5 h-5" :stroke-width="2" />
            </button>
            <h2 class="font-semibold tracking-tight">{{ isEdit ? 'Modifier' : 'Nouvel ajout' }}</h2>
            <button :disabled="saving" type="submit" class="btn-accent !py-1.5 !px-3 text-xs">
              <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" :stroke-width="2.5" />
              <Save v-else class="w-3.5 h-3.5" :stroke-width="2.5" />
              {{ saving ? '' : 'Sauver' }}
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="label">Type</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="(meta, key) in ACTIVITY_TYPES"
                  :key="key"
                  type="button"
                  @click="form.type = key"
                  class="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 border-2 transition"
                  :class="form.type === key ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600'"
                >
                  <component :is="meta.icon" class="w-5 h-5" :stroke-width="1.75" />
                  <span class="text-xs font-medium">{{ meta.label }}</span>
                </button>
              </div>
            </div>

            <div>
              <label class="label">Nom *</label>
              <input v-model="form.name" required class="input" placeholder="Hôtel Ikebukuro, Sushi Kyubey…" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Ville</label>
                <div class="relative">
                  <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model="form.city" class="input pl-9" placeholder="Tokyo" />
                </div>
              </div>
              <div>
                <label class="label">Catégorie</label>
                <div class="relative">
                  <Tag class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model="form.category" class="input pl-9" placeholder="Ramen, Musée…" />
                </div>
              </div>
            </div>

            <div>
              <label class="label">Date{{ form.type === 'hotel' ? ' arrivée' : '' }}</label>
              <div class="relative">
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.date" type="datetime-local" class="input pl-9" />
              </div>
            </div>

            <div v-if="form.type === 'hotel'">
              <label class="label">Date départ</label>
              <div class="relative">
                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.endDate" type="datetime-local" class="input pl-9" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Prix ({{ symbol }})</label>
                <div class="relative">
                  <Wallet class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model.number="form.price" type="number" min="0" class="input pl-9" placeholder="0" />
                </div>
              </div>
              <div>
                <label class="label">Priorité</label>
                <select v-model="form.priority" class="input">
                  <option v-for="o in PRIORITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="label">Lien Booking / site</label>
              <div class="relative">
                <Link2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.bookingUrl" type="url" class="input pl-9" placeholder="https://…" />
              </div>
            </div>

            <div>
              <label class="label">Lien Google Maps</label>
              <div class="relative">
                <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.googleMapsUrl" type="url" class="input pl-9" placeholder="https://maps.app.goo.gl/…" />
              </div>
            </div>

            <div>
              <label class="label">Photo (URL)</label>
              <div class="relative">
                <Image class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.photoUrl" type="url" class="input pl-9" placeholder="https://…" />
              </div>
            </div>

            <div>
              <label class="label">Notes</label>
              <textarea v-model="form.notes" rows="3" class="input resize-none" placeholder="Code de réservation, infos pratiques…" />
            </div>

            <label class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer">
              <input v-model="form.isBooked" type="checkbox" class="w-5 h-5 rounded text-slate-900 focus:ring-slate-900 dark:text-white dark:focus:ring-white" />
              <BadgeCheck class="w-4 h-4 text-emerald-600" :stroke-width="2" />
              <span class="font-medium text-sm">Déjà réservé</span>
            </label>

            <p v-if="error" class="text-sm text-red-600 bg-red-50 ring-1 ring-red-100 dark:bg-red-950/50 dark:ring-red-900 dark:text-red-400 rounded-lg px-3 py-2">{{ error }}</p>

            <div class="pt-2 safe-bottom">
              <button :disabled="saving" type="submit" class="btn-primary w-full py-3">
                <Loader2 v-if="saving" class="w-4 h-4 animate-spin" :stroke-width="2.5" />
                <Save v-else class="w-4 h-4" :stroke-width="2.5" />
                {{ saving ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : 'Créer') }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>
