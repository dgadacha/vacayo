<script setup>
import { ref, computed } from 'vue'
import { useTripsStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { importTrip } from '@/services/transfer'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'imported'])

const trips = useTripsStore()
const auth = useAuthStore()

const file = ref(null)
const preview = ref(null)
const error = ref('')
const importing = ref(false)
const progress = ref({ current: 0, total: 0 })

function close() {
  if (importing.value) return
  emit('update:modelValue', false)
  reset()
}

function reset() {
  file.value = null
  preview.value = null
  error.value = ''
  progress.value = { current: 0, total: 0 }
}

const summary = computed(() => {
  if (!preview.value) return null
  const j = preview.value
  return {
    name: j.trip?.name || j.tripName || 'Voyage importé',
    hotels: j.hotels?.length || 0,
    restaurants: j.restaurants?.length || 0,
    activities: j.activities?.length || 0,
    total: (j.hotels?.length || 0) + (j.restaurants?.length || 0) + (j.activities?.length || 0)
  }
})

async function handleFile(f) {
  if (!f) return
  error.value = ''
  file.value = f
  try {
    const text = await f.text()
    const json = JSON.parse(text)
    if (!json.hotels && !json.restaurants && !json.activities && !json.items) {
      throw new Error('Le fichier ne contient pas de hotels/restaurants/activities')
    }
    preview.value = json
  } catch (e) {
    error.value = e.message || 'JSON invalide'
    preview.value = null
  }
}

function onPick(e) { handleFile(e.target.files?.[0]) }

async function confirmImport() {
  if (!preview.value || importing.value) return
  importing.value = true
  error.value = ''
  try {
    const res = await importTrip(preview.value, {
      tripsStore: trips,
      uid: auth.user?.uid,
      onProgress: (p) => { progress.value = { current: p.current, total: p.total } }
    })
    emit('imported', res)
    emit('update:modelValue', false)
    reset()
  } catch (e) {
    error.value = e.message || 'Erreur lors de l\'import'
  } finally {
    importing.value = false
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
    :close-on-click-overlay="!importing"
    :style="{ maxHeight: '92vh' }"
  >
    <div class="overflow-y-auto" :style="{ maxHeight: '92vh' }">
      <van-nav-bar
        title="Importer un voyage"
        left-text="Annuler"
        @click-left="close"
        :border="false"
      />

      <div v-if="!preview" class="p-5">
        <label class="block cursor-pointer">
          <div class="rounded-lg border-2 border-dashed p-8 text-center" style="border-color: var(--van-border-color);">
            <van-icon name="upgrade" size="40" />
            <p class="font-semibold mt-2">Choisir un fichier JSON</p>
            <p class="text-xs opacity-60 mt-1">Export Vacayo / Flutter</p>
            <input type="file" accept="application/json,.json" class="hidden" @change="onPick" />
          </div>
        </label>
      </div>

      <div v-else>
        <van-cell-group inset title="Aperçu" style="margin-top: 12px;">
          <van-cell :title="summary.name" :label="file?.name" icon="description" />
          <van-cell title="Hôtels" :value="summary.hotels" />
          <van-cell title="Restos" :value="summary.restaurants" />
          <van-cell title="Activités" :value="summary.activities" />
        </van-cell-group>

        <div v-if="importing" class="px-4 mt-4">
          <p class="text-sm mb-1">Import en cours… {{ progress.current }}/{{ progress.total }}</p>
          <van-progress :percentage="progress.total ? (progress.current / progress.total) * 100 : 0" :show-pivot="false" stroke-width="6" />
        </div>

        <div v-else class="px-4 mt-4 text-xs opacity-60">
          Un nouveau voyage sera créé. Tu en seras le propriétaire.
        </div>
      </div>

      <div v-if="error" class="px-4 mt-3">
        <van-notice-bar :text="error" color="#ee0a24" background="#ffebed" />
      </div>

      <div v-if="preview" class="flex gap-2 px-4 mt-4 mb-4 safe-bottom">
        <van-button v-if="!importing" block plain round @click="reset">
          Changer
        </van-button>
        <van-button block type="primary" round :loading="importing" @click="confirmImport">
          Importer {{ summary.total }}
        </van-button>
      </div>
    </div>
  </van-popup>
</template>
