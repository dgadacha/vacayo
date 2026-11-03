<script setup>
import { ref, watch, computed, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { ACTIVITY_TYPES, PRIORITY_OPTIONS } from '@/utils/constants'
import { formatDate, formatTime, parseDate, PICKER_DATE_COLUMNS, toPickerDate, fromPickerDate } from '@/utils/helpers'
import { useAiStore } from '@/stores/ai'
import { enrichDraft, aiErrorMessage, mapsSearchUrl } from '@/services/ai'
import { useToast } from '@/composables/useToast'
import { Sparkles } from 'lucide-vue-next'
import SheetHeader from '@/components/SheetHeader.vue'

const trip = inject('trip', ref(null))
const symbol = computed(() => trip.value?.currencySymbol || '€')

const props = defineProps({
  modelValue: Boolean,
  activity: { type: Object, default: null },
  defaultType: { type: String, default: 'activity' }
})
const emit = defineEmits(['update:modelValue', 'saved'])

const activities = useActivitiesStore()
const ai = useAiStore()
const toast = useToast()
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
    scheduled.value = !!form.value.date
  }
})

// "Planifier" switch (activities and restaurants): off = no date, the item stays in
// the wishlist. Turning it on opens the date picker; cancelling it turns it back off.
const isHotel = computed(() => form.value.type === 'hotel')
const scheduled = ref(false)
watch(() => form.value.date, (d) => { if (d) scheduled.value = true })
function setScheduled(on) {
  scheduled.value = on
  if (on) showDatePicker.value = true
  else form.value.date = ''
}
function onDateCancel() {
  showDatePicker.value = false
  if (!form.value.date) scheduled.value = false
}
// A new date starts on the trip's first day while the trip is still ahead
const pickerFallback = computed(() => {
  const start = parseDate(trip.value?.startDate)
  return start && start > new Date() ? start : new Date()
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
function parseTimeColumns(value) {
  if (!value || !value.includes('T')) return ['10', '00']
  const time = value.split('T')[1] || '10:00'
  const [h, mi] = time.split(':')
  return [h, mi]
}
const dateLabel = computed(() => {
  if (!form.value.date) return ''
  const datePart = formatDate(form.value.date, 'dd/MM/yyyy')
  const timePart = formatTime(form.value.date)
  return timePart ? `${datePart} · ${timePart}` : datePart
})
const endDateLabel = computed(() => {
  if (!form.value.endDate) return ''
  const datePart = formatDate(form.value.endDate, 'dd/MM/yyyy')
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
  const d = fromPickerDate(selectedValues)
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
  const d = fromPickerDate(selectedValues)
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

// AI: fill the blanks from the name (never overwrites what the user typed)
const enriching = ref(false)
let enrichAbort = null
async function enrich() {
  if (!form.value.name?.trim() || enriching.value) return
  if (!ai.requireReady()) return
  enriching.value = true
  enrichAbort = new AbortController()
  try {
    const r = await enrichDraft({ trip: trip.value, draft: form.value, signal: enrichAbort.signal })
    const f = form.value
    const filled = []
    if (!f.city && r.city) { f.city = r.city; filled.push('ville') }
    if (!f.category && r.category) { f.category = r.category; filled.push('catégorie') }
    if (!Number(f.price) && r.price > 0) { f.price = Math.round(r.price); filled.push('prix estimé') }
    if ((!f.priority || f.priority === 'normal') && r.priority && r.priority !== 'normal') { f.priority = r.priority; filled.push('priorité') }
    if (r.notes) { f.notes = f.notes ? `${f.notes}\n\n${r.notes}` : r.notes; filled.push('conseils') }
    if (!f.googleMapsUrl) f.googleMapsUrl = mapsSearchUrl(f.name, f.city)
    toast.info(filled.length ? `✨ Complété : ${filled.join(', ')}` : 'Rien à compléter')
  } catch (e) {
    const msg = aiErrorMessage(e)
    if (msg) toast.error(msg)
  } finally {
    enriching.value = false
    enrichAbort = null
  }
}

function close() {
  if (saving.value) return
  enrichAbort?.abort()
  emit('update:modelValue', false)
}

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
    teleport="body"
    :close-on-click-overlay="!saving"
    :style="{ height: 'var(--vc-sheet-h)', background: 'var(--vc-bg)' }"
  >
    <div class="h-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" style="background: var(--vc-bg)">
      <SheetHeader
        :title="isEdit ? 'Modifier' : 'Nouvel élément'"
        cancel-label="Annuler"
        :action-label="isEdit ? 'OK' : 'Ajouter'"
        :action-disabled="!form.name?.trim()"
        :action-loading="saving"
        @cancel="close"
        @action="submit"
      />

      <van-form @submit="submit">
        <div class="px-4 pt-2">
          <div class="segmented" role="group" aria-label="Type">
            <button
              v-for="(meta, key) in ACTIVITY_TYPES"
              :key="key"
              type="button"
              :aria-pressed="form.type === key"
              @click="form.type = key"
            >{{ meta.label }}</button>
          </div>
        </div>

        <van-cell-group inset title="Détails">
          <van-field
            v-model="form.name"
            name="name"
            label="Nom"
            placeholder="Hôtel Tokyo, Sushi Kyubey…"
            :rules="[{ required: true, message: 'Nom requis' }]"
            clearable
          />
          <van-field v-model="form.city" label="Ville" placeholder="Tokyo" clearable />
          <van-field v-model="form.category" label="Catégorie" placeholder="Ramen, Musée…" clearable />
        </van-cell-group>
        <div class="mx-4 mt-4 rounded-xl" :class="{ 'ai-glow': enriching }">
        <div class="list !mx-0">
          <button type="button" class="row disabled:opacity-40" :disabled="!form.name?.trim() || enriching" @click="enrich">
            <span class="row-icon" style="background: var(--vc-ai)">
              <van-loading v-if="enriching" size="15" color="#fff" />
              <Sparkles v-else class="w-[17px] h-[17px]" :stroke-width="2" />
            </span>
            <span class="t-body text-tint flex-1">{{ enriching ? 'L’IA complète la fiche…' : 'Compléter avec l’IA' }}</span>
          </button>
        </div>
        </div>
        <p class="list-footer">Ville, catégorie, prix estimé et conseils à partir du nom. Seuls les champs vides sont remplis.</p>

        <van-cell-group inset :title="form.type === 'hotel' ? 'Séjour' : 'Planning'">
          <!-- Activities and restaurants may have no date (Reminders-style switch) -->
          <van-cell v-if="!isHotel" title="Planifier" center>
            <template #right-icon>
              <van-switch :model-value="scheduled" @update:model-value="setScheduled" />
            </template>
          </van-cell>
          <van-field
            v-if="isHotel || scheduled"
            readonly
            clickable
            :model-value="dateLabel"
            :label="form.type === 'hotel' ? 'Arrivée' : 'Date'"
            placeholder="Choisir"
            is-link
            @click="showDatePicker = true"
          />
          <van-field
            v-if="form.date"
            readonly
            clickable
            :model-value="formatTime(form.date) || '—'"
            label="Heure"
            is-link
            @click="showTimePicker = true"
          />
          <template v-if="form.type === 'hotel'">
            <van-field
              readonly
              clickable
              :model-value="endDateLabel"
              label="Départ"
              placeholder="Choisir"
              is-link
              @click="showEndDatePicker = true"
            />
            <van-field
              v-if="form.endDate"
              readonly
              clickable
              :model-value="formatTime(form.endDate) || '—'"
              label="Heure"
              is-link
              @click="showEndTimePicker = true"
            />
          </template>
        </van-cell-group>
        <p v-if="!isHotel && !scheduled" class="list-footer">Sans date, l’élément reste dans ta liste d’envies : tu le planifies plus tard, toi ou l’IA.</p>

        <van-cell-group inset title="Budget & priorité">
          <van-field
            v-model.number="form.price"
            label="Prix"
            type="number"
            placeholder="0"
          >
            <template #button>
              <span class="text-muted t-body">{{ symbol }}</span>
            </template>
          </van-field>
          <van-field
            readonly
            clickable
            :model-value="priorityLabel"
            label="Priorité"
            is-link
            @click="showPriorityPicker = true"
          />
          <van-cell title="Déjà réservé">
            <template #right-icon>
              <van-switch v-model="form.isBooked" />
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset title="Liens">
          <van-field v-model="form.bookingUrl" label="Booking" placeholder="https://…" clearable />
          <van-field v-model="form.googleMapsUrl" label="Maps" placeholder="https://maps.app.goo.gl/…" clearable />
          <van-field v-model="form.photoUrl" label="Photo" placeholder="https://…" clearable />
        </van-cell-group>

        <van-cell-group inset title="Notes">
          <van-field
            v-model="form.notes"
            type="textarea"
            placeholder="Code de réservation, infos pratiques…"
            rows="3"
            autosize
          />
        </van-cell-group>

        <p v-if="error" role="alert" class="list-footer !text-[color:var(--vc-red)]">{{ error }}</p>

      </van-form>
    </div>
  </van-popup>

  <van-popup v-model:show="showDatePicker" position="bottom" round teleport="body">
    <van-date-picker
      :model-value="toPickerDate(form.date, pickerFallback)"
      :columns-type="PICKER_DATE_COLUMNS"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2035, 11, 31)"
      title="Date"
      @confirm="onDateConfirm"
      @cancel="onDateCancel"
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
      :model-value="toPickerDate(form.endDate || form.date)"
      :columns-type="PICKER_DATE_COLUMNS"
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
