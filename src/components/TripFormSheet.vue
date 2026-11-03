<script setup>
import { ref, watch, computed } from 'vue'
import { useTripsStore } from '@/stores/trips'
import { CURRENCIES, formatDate, PICKER_DATE_COLUMNS, toPickerDate, fromPickerDate } from '@/utils/helpers'
import SheetHeader from '@/components/SheetHeader.vue'

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
// Creation only: open the AI trip generator right after the trip is created
const withAi = ref(true)
const canGenerate = computed(() => !!(form.value.destination.trim() && form.value.startDate && form.value.endDate))

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
    withAi.value = true
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

function onStartConfirm({ selectedValues }) {
  form.value.startDate = fromPickerDate(selectedValues)
  showStartPicker.value = false
}
function onEndConfirm({ selectedValues }) {
  form.value.endDate = fromPickerDate(selectedValues)
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
      emit('saved', { ...t, generate: withAi.value && canGenerate.value })
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
    teleport="body"
    :close-on-click-overlay="!saving"
    :style="{ height: '94vh', background: 'var(--vc-bg)' }"
  >
    <div class="h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" style="background: var(--vc-bg)">
      <SheetHeader
        :title="isEdit ? 'Modifier le voyage' : 'Nouveau voyage'"
        cancel-label="Annuler"
        :action-label="isEdit ? 'OK' : 'Créer'"
        :action-disabled="!form.name?.trim()"
        :action-loading="saving"
        @cancel="close"
        @action="submit"
      />

      <van-form @submit="submit">
        <van-cell-group inset title="Infos">
          <van-field
            v-model="form.name"
            name="name"
            label="Nom"
            placeholder="Japon 2026"
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
            :model-value="form.startDate ? formatDate(form.startDate, 'dd/MM/yyyy') : ''"
            label="Début"
            placeholder="Choisir"
            is-link
            @click="showStartPicker = true"
          />
          <van-field
            readonly
            clickable
            :model-value="form.endDate ? formatDate(form.endDate, 'dd/MM/yyyy') : ''"
            label="Fin"
            placeholder="Choisir"
            is-link
            @click="showEndPicker = true"
          />
        </van-cell-group>

        <template v-if="!isEdit">
          <van-cell-group inset title="Assistant IA">
            <van-cell title="Préparer avec l’IA" center>
              <template #right-icon>
                <van-switch v-model="withAi" />
              </template>
            </van-cell>
          </van-cell-group>
          <p class="list-footer">{{ canGenerate ? 'L’IA proposera étapes, hôtels et programme jour par jour, à valider avant ajout.' : 'Renseigne la destination et les dates pour que l’IA prépare le voyage.' }}</p>
        </template>

        <van-cell-group inset title="Budget">
          <van-field
            readonly
            clickable
            :model-value="currencyLabel"
            label="Devise"
            is-link
            @click="showCurrencyPicker = true"
          />
          <van-field
            v-model.number="form.budget"
            label="Total"
            type="number"
            placeholder="0"
          >
            <template #button>
              <span class="text-muted t-body">{{ form.currencySymbol }}</span>
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
        <div v-if="form.coverImage" class="mx-4 mt-3 rounded-xl overflow-hidden aspect-video surface-2">
          <img :src="form.coverImage" class="w-full h-full object-cover" @error="$event.target.style.display='none'" />
        </div>

        <p v-if="error" role="alert" class="list-footer !text-[color:var(--vc-red)]">{{ error }}</p>

      </van-form>
    </div>
  </van-popup>

  <!-- Pickers (teleported above the popup) -->
  <van-popup v-model:show="showStartPicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="toPickerDate(form.startDate)"
      :columns-type="PICKER_DATE_COLUMNS"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2035, 11, 31)"
      title="Date de début"
      @confirm="onStartConfirm"
      @cancel="showStartPicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showEndPicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="toPickerDate(form.endDate || form.startDate)"
      :columns-type="PICKER_DATE_COLUMNS"
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
