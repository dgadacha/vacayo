<script setup>
import { ref, computed } from 'vue'
import { useTripsStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { importTrip } from '@/services/transfer'
import { Upload, X, FileJson, Check, AlertCircle, Loader2 } from 'lucide-vue-next'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue', 'imported'])

const trips = useTripsStore()
const auth = useAuthStore()

const file = ref(null)
const preview = ref(null)
const error = ref('')
const importing = ref(false)
const progress = ref({ current: 0, total: 0 })
const dragOver = ref(false)

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
    destination: j.trip?.destination || '',
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

function onDrop(e) {
  e.preventDefault()
  dragOver.value = false
  handleFile(e.dataTransfer?.files?.[0])
}

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
    <div class="overflow-y-auto bg-white dark:bg-slate-900" :style="{ maxHeight: '92vh' }">
          <div class="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between rounded-t-3xl z-10">
            <button type="button" @click="close" :disabled="importing" class="btn-icon -ml-1 disabled:opacity-40">
              <X class="w-5 h-5" :stroke-width="2" />
            </button>
            <h2 class="font-semibold tracking-tight">Importer un voyage</h2>
            <div class="w-9" />
          </div>

          <div class="p-5 space-y-4">
            <!-- Dropzone -->
            <label
              v-if="!preview"
              class="block cursor-pointer"
              @dragover.prevent="dragOver = true"
              @dragleave.prevent="dragOver = false"
              @drop="onDrop"
            >
              <div
                class="rounded-2xl border-2 border-dashed p-8 text-center transition"
                :class="dragOver ? 'border-slate-900 bg-slate-50 dark:border-white dark:bg-slate-800' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'"
              >
                <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mb-3">
                  <Upload class="w-6 h-6" :stroke-width="1.75" />
                </div>
                <p class="font-semibold">Glisse un fichier JSON</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">ou clique pour parcourir</p>
                <input type="file" accept="application/json,.json" class="hidden" @change="onPick" />
              </div>
            </label>

            <!-- Preview -->
            <div v-else class="space-y-3">
              <div class="rounded-2xl bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 p-4">
                <div class="flex items-center gap-2.5">
                  <div class="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700 flex items-center justify-center">
                    <FileJson class="w-5 h-5 text-slate-500 dark:text-slate-400" :stroke-width="1.75" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-semibold text-sm truncate">{{ summary.name }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ file?.name }}</p>
                  </div>
                </div>
                <div class="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div class="bg-white dark:bg-slate-900 rounded-lg p-2 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p class="text-base font-bold">{{ summary.hotels }}</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Hôtels</p>
                  </div>
                  <div class="bg-white dark:bg-slate-900 rounded-lg p-2 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p class="text-base font-bold">{{ summary.restaurants }}</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Restos</p>
                  </div>
                  <div class="bg-white dark:bg-slate-900 rounded-lg p-2 ring-1 ring-slate-200 dark:ring-slate-700">
                    <p class="text-base font-bold">{{ summary.activities }}</p>
                    <p class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Activités</p>
                  </div>
                </div>
              </div>

              <div v-if="importing" class="space-y-2">
                <div class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Loader2 class="w-4 h-4 animate-spin" :stroke-width="2" />
                  <span>Import en cours… {{ progress.current }}/{{ progress.total }}</span>
                </div>
                <div class="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div class="h-full bg-slate-900 dark:bg-white transition-all" :style="{ width: progress.total ? (progress.current / progress.total * 100) + '%' : '0%' }" />
                </div>
              </div>

              <p class="text-xs text-slate-500 dark:text-slate-400">
                Un nouveau voyage sera créé. Tu en seras le propriétaire. Aucun voyage existant n'est modifié.
              </p>
            </div>

            <p v-if="error" class="text-sm text-red-600 bg-red-50 ring-1 ring-red-100 dark:bg-red-950/50 dark:ring-red-900 dark:text-red-400 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertCircle class="w-4 h-4 mt-0.5 flex-shrink-0" :stroke-width="2" />
              <span>{{ error }}</span>
            </p>

            <div class="flex gap-2 pt-2 safe-bottom">
              <button v-if="preview && !importing" type="button" @click="reset" class="btn-secondary flex-1">
                Changer de fichier
              </button>
              <button
                v-if="preview"
                @click="confirmImport"
                :disabled="importing"
                class="btn-primary flex-1"
              >
                <Loader2 v-if="importing" class="w-4 h-4 animate-spin" :stroke-width="2.5" />
                <template v-else>
                  <Check class="w-4 h-4" :stroke-width="2.5" />
                  Importer {{ summary.total }} item{{ summary.total > 1 ? 's' : '' }}
                </template>
              </button>
            </div>
          </div>
    </div>
  </van-popup>
</template>
