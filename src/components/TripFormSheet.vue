<script setup>
import { ref, watch, computed } from 'vue'
import { useTripsStore } from '@/stores/trips'
import { CURRENCIES, formatDate } from '@/utils/helpers'

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
const showStartPicker = ref(false)
const showEndPicker = ref(false)
const showCurrencyPicker = ref(false)

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

const currencyLabel = computed(() => {
  const c = CURRENCIES.find(x => x.code === form.value.currency)
  return c ? `${c.symbol} — ${c.code}` : form.value.currency
})

const currencyColumns = computed(() =>
  CURRENCIES.map(c => ({ text: `${c.symbol} — ${c.code} (${c.label})`, value: c.code }))
)

function onCurrencyConfirm({ selectedOptions }) {
  const code = selectedOptions[0].value
  const c = CURRENCIES.find(x => x.code === code)
  if (c) {
    form.value.currency = c.code
    form.value.currencySymbol = c.symbol
  }
  showCurrencyPicker.value = false
}

function parseToColumns(value) {
  if (!value) return [String(new Date().getFullYear()), '01', '01']
  const d = value.includes('T') ? value.split('T')[0] : value
  const [y, m, day] = d.split('-')
  return [y, m, day]
}

function onStartConfirm({ selectedValues }) {
  form.value.startDate = selectedValues.join('-')
  showStartPicker.value = false
}
function onEndConfirm({ selectedValues }) {
  form.value.endDate = selectedValues.join('-')
  showEndPicker.value = false
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
  <van-popup
    :show="modelValue"
    @update:show="$emit('update:modelValue', $event)"
    position="bottom"
    round
    safe-area-inset-bottom
    teleport="body"
    :close-on-click-overlay="!saving"
    :style="{ maxHeight: '92vh' }"
  >
    <div class="overflow-y-auto" :style="{ maxHeight: '92vh', background: 'var(--vc-bg)' }">
      <div class="sticky top-0 z-10 flex items-center justify-between px-4 h-14 backdrop-blur-xl" style="background: color-mix(in srgb, var(--vc-bg) 90%, transparent)">
        <button type="button" class="text-sm font-medium text-muted" @click="close">Annuler</button>
        <h2 class="font-bold text-base">{{ isEdit ? 'Modifier le voyage' : 'Nouveau voyage' }}</h2>
        <button type="button" class="text-sm font-semibold" style="color: var(--vc-primary)" :disabled="saving" @click="submit">{{ saving ? '…' : 'Enregistrer' }}</button>
      </div>

      <van-form @submit="submit" class="pb-4">
        <van-cell-group inset title="Infos">
          <van-field
            v-model="form.name"
            name="name"
            label="Nom"
            placeholder="Japon 2026"
            required
            :rules="[{ required: true, message: 'Nom requis' }]"
            clearable
          />
          <van-field
            v-model="form.destination"
            label="Destination"
            placeholder="Tokyo"
            clearable
          />
          <van-field
            v-model="form.country"
            label="Pays"
            placeholder="Japon"
            clearable
          />
        </van-cell-group>

        <van-cell-group inset title="Dates">
          <van-field
            readonly
            clickable
            :model-value="form.startDate ? formatDate(form.startDate, 'd MMM yyyy') : ''"
            label="Début"
            placeholder="Choisir"
            right-icon="calendar-o"
            @click="showStartPicker = true"
          />
          <van-field
            readonly
            clickable
            :model-value="form.endDate ? formatDate(form.endDate, 'd MMM yyyy') : ''"
            label="Fin"
            placeholder="Choisir"
            right-icon="calendar-o"
            @click="showEndPicker = true"
          />
        </van-cell-group>

        <van-cell-group inset title="Budget">
          <van-field
            readonly
            clickable
            :model-value="currencyLabel"
            label="Devise"
            right-icon="arrow"
            @click="showCurrencyPicker = true"
          />
          <van-field
            v-model.number="form.budget"
            label="Total"
            type="number"
            placeholder="0"
          >
            <template #button>
              <span class="text-muted text-sm">{{ form.currencySymbol }}</span>
            </template>
          </van-field>
        </van-cell-group>

        <van-cell-group inset title="Image de couverture">
          <van-field
            v-model="form.coverImage"
            label="URL"
            placeholder="https://…"
            clearable
          />
        </van-cell-group>
        <div v-if="form.coverImage" class="mx-4 mt-2 rounded-2xl overflow-hidden aspect-video surface-2">
          <img :src="form.coverImage" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
        </div>

        <p v-if="error" role="alert" class="mx-4 mt-3 rounded-xl px-3 py-2.5 text-sm bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{{ error }}</p>

        <div class="px-4 mt-5">
          <van-button
            block
            type="primary"
            size="large"
            round
            native-type="submit"
            :loading="saving"
          >
            {{ isEdit ? 'Mettre à jour' : 'Créer' }}
          </van-button>
        </div>
      </van-form>
    </div>
  </van-popup>

  <!-- Pickers (teleported above the popup) -->
  <van-popup v-model:show="showStartPicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="parseToColumns(form.startDate)"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2035, 11, 31)"
      title="Date de début"
      @confirm="onStartConfirm"
      @cancel="showStartPicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showEndPicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="parseToColumns(form.endDate)"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2035, 11, 31)"
      title="Date de fin"
      @confirm="onEndConfirm"
      @cancel="showEndPicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showCurrencyPicker" position="bottom" round teleport="body">
    <van-picker
      :model-value="[form.currency]"
      :columns="currencyColumns"
      title="Devise"
      @confirm="onCurrencyConfirm"
      @cancel="showCurrencyPicker = false"
    />
  </van-popup>
</template>
