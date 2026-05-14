<script setup>
import { ref, watch, computed, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatDate, formatTime } from '@/utils/helpers'

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
const showDatePicker = ref(false)
const showTimePicker = ref(false)
const showEndDatePicker = ref(false)
const showEndTimePicker = ref(false)
const showPriorityPicker = ref(false)

function emptyForm() {
  return {
    type: props.defaultType,
    name: '', city: '', category: '',
    price: 0, date: '', endDate: '',
    notes: '', photoUrl: '', bookingUrl: '', googleMapsUrl: '',
    priority: 'normal', isBooked: false
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    error.value = ''
    form.value = props.activity ? { ...emptyForm(), ...props.activity } : { ...emptyForm(), type: props.defaultType }
  }
})

const typeOptions = computed(() =>
  Object.entries(ACTIVITY_TYPES).map(([k, v]) => ({ text: v.label, value: k }))
)
const priorityOptions = computed(() =>
  PRIORITY_OPTIONS.map(o => ({ text: o.label, value: o.value }))
)
const priorityLabel = computed(() =>
  PRIORITY_OPTIONS.find(o => o.value === form.value.priority)?.label || 'Normal'
)

// Date/time helpers
function parseDateColumns(value) {
  if (!value) {
    const now = new Date()
    return [String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')]
  }
  const d = value.split('T')[0]
  const [y, m, day] = d.split('-')
  return [y, m, day]
}
function parseTimeColumns(value) {
  if (!value || !value.includes('T')) return ['10', '00']
  const time = value.split('T')[1] || '10:00'
  const [h, mi] = time.split(':')
  return [h, mi]
}
const dateLabel = computed(() => {
  if (!form.value.date) return ''
  const datePart = formatDate(form.value.date, 'd MMM yyyy')
  const timePart = formatTime(form.value.date)
  return timePart ? `${datePart} · ${timePart}` : datePart
})
const endDateLabel = computed(() => {
  if (!form.value.endDate) return ''
  const datePart = formatDate(form.value.endDate, 'd MMM yyyy')
  const timePart = formatTime(form.value.endDate)
  return timePart ? `${datePart} · ${timePart}` : datePart
})

function combineDateTime(dateStr, timeStr = '10:00') {
  return `${dateStr}T${timeStr}`
}
function splitDateTime(value) {
  if (!value) return { date: '', time: '10:00' }
  const [date, time] = value.split('T')
  return { date: date || '', time: (time || '10:00').slice(0, 5) }
}

function onDateConfirm({ selectedValues }) {
  const d = selectedValues.join('-')
  const { time } = splitDateTime(form.value.date)
  form.value.date = combineDateTime(d, time)
  showDatePicker.value = false
}
function onTimeConfirm({ selectedValues }) {
  const t = selectedValues.join(':')
  const { date } = splitDateTime(form.value.date)
  if (date) form.value.date = combineDateTime(date, t)
  showTimePicker.value = false
}
function onEndDateConfirm({ selectedValues }) {
  const d = selectedValues.join('-')
  const { time } = splitDateTime(form.value.endDate)
  form.value.endDate = combineDateTime(d, time || '11:00')
  showEndDatePicker.value = false
}
function onEndTimeConfirm({ selectedValues }) {
  const t = selectedValues.join(':')
  const { date } = splitDateTime(form.value.endDate)
  if (date) form.value.endDate = combineDateTime(date, t)
  showEndTimePicker.value = false
}
function onPriorityConfirm({ selectedOptions }) {
  form.value.priority = selectedOptions[0].value
  showPriorityPicker.value = false
}

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
    <div class="overflow-y-auto bg-white dark:bg-slate-900" :style="{ maxHeight: '92vh' }">
      <van-nav-bar
        :title="isEdit ? 'Modifier' : 'Nouvel ajout'"
        left-text="Annuler"
        :right-text="saving ? '…' : 'Sauver'"
        @click-left="close"
        @click-right="submit"
        :border="false"
      />

      <van-form @submit="submit" class="pb-6">
        <van-cell-group inset title="Type">
          <div class="grid grid-cols-3 gap-2 p-3">
            <button
              v-for="(meta, key) in ACTIVITY_TYPES"
              :key="key"
              type="button"
              @click="form.type = key"
              class="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 border-2 transition"
              :class="form.type === key ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'"
            >
              <component :is="meta.icon" class="w-5 h-5" :stroke-width="1.75" />
              <span class="text-xs font-medium">{{ meta.label }}</span>
            </button>
          </div>
        </van-cell-group>

        <van-cell-group inset title="Détails" class="!mt-4">
          <van-field
            v-model="form.name"
            name="name"
            label="Nom"
            placeholder="Hôtel Tokyo, Sushi Kyubey…"
            required
            :rules="[{ required: true, message: 'Nom requis' }]"
            clearable
          />
          <van-field v-model="form.city" label="Ville" placeholder="Tokyo" clearable />
          <van-field v-model="form.category" label="Catégorie" placeholder="Ramen, Musée…" clearable />
        </van-cell-group>

        <van-cell-group inset :title="form.type === 'hotel' ? 'Séjour' : 'Date'" class="!mt-4">
          <van-field
            readonly
            clickable
            :model-value="dateLabel"
            :label="form.type === 'hotel' ? 'Arrivée' : 'Date'"
            placeholder="Choisir"
            right-icon="calendar-o"
            @click="showDatePicker = true"
          />
          <van-field
            v-if="form.date"
            readonly
            clickable
            :model-value="formatTime(form.date) || '—'"
            label="Heure"
            right-icon="clock-o"
            @click="showTimePicker = true"
          />
          <template v-if="form.type === 'hotel'">
            <van-field
              readonly
              clickable
              :model-value="endDateLabel"
              label="Départ"
              placeholder="Choisir"
              right-icon="calendar-o"
              @click="showEndDatePicker = true"
            />
            <van-field
              v-if="form.endDate"
              readonly
              clickable
              :model-value="formatTime(form.endDate) || '—'"
              label="Heure"
              right-icon="clock-o"
              @click="showEndTimePicker = true"
            />
          </template>
        </van-cell-group>

        <van-cell-group inset title="Budget & priorité" class="!mt-4">
          <van-field
            v-model.number="form.price"
            label="Prix"
            type="number"
            placeholder="0"
          >
            <template #button>
              <span class="text-slate-500 text-sm">{{ symbol }}</span>
            </template>
          </van-field>
          <van-field
            readonly
            clickable
            :model-value="priorityLabel"
            label="Priorité"
            right-icon="arrow"
            @click="showPriorityPicker = true"
          />
          <van-cell title="Déjà réservé">
            <template #right-icon>
              <van-switch v-model="form.isBooked" size="22" />
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset title="Liens" class="!mt-4">
          <van-field v-model="form.bookingUrl" label="Booking" placeholder="https://…" clearable />
          <van-field v-model="form.googleMapsUrl" label="Maps" placeholder="https://maps.app.goo.gl/…" clearable />
          <van-field v-model="form.photoUrl" label="Photo" placeholder="https://…" clearable />
        </van-cell-group>

        <van-cell-group inset title="Notes" class="!mt-4">
          <van-field
            v-model="form.notes"
            type="textarea"
            placeholder="Code de réservation, infos pratiques…"
            rows="3"
            autosize
          />
        </van-cell-group>

        <div v-if="error" class="mx-4 mt-3">
          <van-notice-bar :text="error" color="#dc2626" background="#fef2f2" />
        </div>

        <div class="px-4 mt-5">
          <van-button block type="primary" size="large" round native-type="submit" :loading="saving">
            {{ isEdit ? 'Mettre à jour' : 'Créer' }}
          </van-button>
        </div>
      </van-form>
    </div>
  </van-popup>

  <van-popup v-model:show="showDatePicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="parseDateColumns(form.date)"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2035, 11, 31)"
      title="Date"
      @confirm="onDateConfirm"
      @cancel="showDatePicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showTimePicker" position="bottom" round teleport="body">
    <van-time-picker
      :model-value="parseTimeColumns(form.date)"
      title="Heure"
      @confirm="onTimeConfirm"
      @cancel="showTimePicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showEndDatePicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="parseDateColumns(form.endDate)"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2035, 11, 31)"
      title="Date de départ"
      @confirm="onEndDateConfirm"
      @cancel="showEndDatePicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showEndTimePicker" position="bottom" round teleport="body">
    <van-time-picker
      :model-value="parseTimeColumns(form.endDate)"
      title="Heure de départ"
      @confirm="onEndTimeConfirm"
      @cancel="showEndTimePicker = false"
    />
  </van-popup>
  <van-popup v-model:show="showPriorityPicker" position="bottom" round teleport="body">
    <van-picker
      :model-value="[form.priority]"
      :columns="priorityOptions"
      title="Priorité"
      @confirm="onPriorityConfirm"
      @cancel="showPriorityPicker = false"
    />
  </van-popup>
</template>
