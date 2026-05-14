<script setup>
import { ref, watch, computed } from 'vue'
import { useTripsStore } from '@/stores/trips'
import { CURRENCIES } from '@/utils/helpers'
import { X, Save, Plus, Plane, MapPin, Globe2, Calendar, Wallet, Image, Loader2, CircleDollarSign } from 'lucide-vue-next'

const props = defineProps({
  modelValue: Boolean,
  trip: { type: Object, default: null }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const trips = useTripsStore()
const isEdit = computed(() => !!props.trip?.id)
const saving = ref(false)
const error = ref('')

const form = ref(emptyForm())

function emptyForm() {
  return {
    name: '', destination: '', country: '',
    startDate: '', endDate: '',
    currency: 'EUR', currencySymbol: '€',
    budget: 0, coverImage: ''
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    error.value = ''
    if (props.trip) {
      form.value = {
        name: props.trip.name || '',
        destination: props.trip.destination || '',
        country: props.trip.country || '',
        startDate: props.trip.startDate || '',
        endDate: props.trip.endDate || '',
        currency: props.trip.currency || 'EUR',
        currencySymbol: props.trip.currencySymbol || '€',
        budget: Number(props.trip.budget) || 0,
        coverImage: props.trip.coverImage || ''
      }
    } else {
      form.value = emptyForm()
    }
  }
})

function onCurrencyChange(code) {
  const c = CURRENCIES.find(x => x.code === code)
  if (c) {
    form.value.currency = c.code
    form.value.currencySymbol = c.symbol
  }
}

function close() { if (!saving.value) emit('update:modelValue', false) }

async function submit() {
  if (!form.value.name?.trim() || saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (isEdit.value) {
      await trips.updateTrip(props.trip.id, form.value)
      emit('saved', { id: props.trip.id, ...form.value })
    } else {
      const t = await trips.createTrip(form.value)
      emit('saved', t)
    }
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
        <div class="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto animate-slide-up">
          <div class="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between rounded-t-3xl z-10">
            <button type="button" @click="close" :disabled="saving" class="btn-icon -ml-1 disabled:opacity-40">
              <X class="w-5 h-5" :stroke-width="2" />
            </button>
            <h2 class="font-semibold tracking-tight">{{ isEdit ? 'Modifier le voyage' : 'Nouveau voyage' }}</h2>
            <button :disabled="saving" type="submit" class="btn-accent !py-1.5 !px-3 text-xs">
              <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" :stroke-width="2.5" />
              <Save v-else class="w-3.5 h-3.5" :stroke-width="2.5" />
              {{ saving ? '' : 'Sauver' }}
            </button>
          </div>

          <div class="p-5 space-y-4">
            <div>
              <label class="label">Nom *</label>
              <div class="relative">
                <Plane class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.name" required class="input pl-9" placeholder="Japon 2026" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Destination</label>
                <div class="relative">
                  <MapPin class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model="form.destination" class="input pl-9" placeholder="Tokyo" />
                </div>
              </div>
              <div>
                <label class="label">Pays</label>
                <div class="relative">
                  <Globe2 class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model="form.country" class="input pl-9" placeholder="Japon" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Début</label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model="form.startDate" type="date" class="input pl-9" />
                </div>
              </div>
              <div>
                <label class="label">Fin</label>
                <div class="relative">
                  <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model="form.endDate" type="date" class="input pl-9" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Devise</label>
                <div class="relative">
                  <CircleDollarSign class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <select :value="form.currency" @change="onCurrencyChange($event.target.value)" class="input pl-9 appearance-none">
                    <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">{{ c.symbol }} — {{ c.code }} ({{ c.label }})</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="label">Budget total</label>
                <div class="relative">
                  <Wallet class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                  <input v-model.number="form.budget" type="number" min="0" class="input pl-9" placeholder="0" />
                </div>
              </div>
            </div>

            <div>
              <label class="label">Image de couverture (URL)</label>
              <div class="relative">
                <Image class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
                <input v-model="form.coverImage" type="url" class="input pl-9" placeholder="https://…" />
              </div>
              <div v-if="form.coverImage" class="mt-2 rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700 aspect-video bg-slate-50 dark:bg-slate-800">
                <img :src="form.coverImage" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
              </div>
            </div>

            <p v-if="error" class="text-sm text-red-600 bg-red-50 ring-1 ring-red-100 dark:bg-red-950/50 dark:ring-red-900 dark:text-red-400 rounded-lg px-3 py-2">{{ error }}</p>

            <div class="pt-2 safe-bottom">
              <button :disabled="saving" type="submit" class="btn-primary w-full py-3">
                <Loader2 v-if="saving" class="w-4 h-4 animate-spin" :stroke-width="2.5" />
                <template v-else>
                  <component :is="isEdit ? Save : Plus" class="w-4 h-4" :stroke-width="2.5" />
                  {{ isEdit ? 'Mettre à jour' : 'Créer' }}
                </template>
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
