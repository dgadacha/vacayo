<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { formatDate, colorFromString } from '@/utils/helpers'
import { Plus, LogOut, ChevronRight, Plane, Globe2, Calendar, Trash2, Crown, Pencil, MapPin, Upload } from 'lucide-vue-next'
import ImportDialog from '@/components/ImportDialog.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import Skeleton from '@/components/Skeleton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const router = useRouter()
const trips = useTripsStore()
const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()

const showCreate = ref(false)
const showImport = ref(false)

const sortedTrips = computed(() => trips.sortedTrips)
const loading = computed(() => trips.loading)

function tripGradient(t) { return colorFromString(t.name || t.id) }
function roleOf(t) { return trips.roleOf(t) }

function open(t) { router.push({ name: 'trip', params: { id: t.id } }) }

function onCreated(t) {
  toast.success(`Voyage "${t.name}" créé`)
  router.push({ name: 'trip', params: { id: t.id } })
}

async function confirmDelete(t, evt) {
  evt?.stopPropagation()
  if (!trips.isOwner(t)) {
    toast.error('Seul le propriétaire peut supprimer ce voyage')
    return
  }
  const ok = await confirm({
    title: `Supprimer "${t.name}" ?`,
    message: 'Les activités liées resteront en base. Cette action est irréversible.',
    confirmLabel: 'Supprimer',
    destructive: true
  })
  if (!ok) return
  try {
    await trips.deleteTrip(t.id)
    toast.success('Voyage supprimé')
  } catch (e) {
    toast.error(e.message || 'Erreur lors de la suppression')
  }
}

async function logout() {
  await auth.logout()
  router.replace({ name: 'login' })
}

function onImported(res) {
  toast.success(`${res.count} items importés dans "${res.tripName}"`)
  router.push({ name: 'trip', params: { id: res.tripId } })
}
</script>

<template>
  <main class="min-h-screen pb-24">
    <header class="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/70 safe-top">
      <div class="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
        <div class="min-w-0">
          <h1 class="text-[22px] font-bold tracking-tight">Mes voyages</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ auth.user?.email }}</p>
        </div>
        <div class="flex items-center gap-1">
          <ThemeToggle />
          <button @click="showImport = true" class="btn-icon" aria-label="Importer un JSON" title="Importer un JSON">
            <Upload class="w-5 h-5" :stroke-width="2" />
          </button>
          <button @click="logout" class="btn-icon" aria-label="Déconnexion">
            <LogOut class="w-5 h-5" :stroke-width="2" />
          </button>
        </div>
      </div>
    </header>

    <section class="max-w-2xl mx-auto px-5 mt-4">
      <Skeleton v-if="loading && sortedTrips.length === 0" variant="trip" :count="3" />

      <div v-else-if="sortedTrips.length === 0" class="card p-10 text-center mt-8">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 mb-4">
          <Globe2 class="w-7 h-7" :stroke-width="1.5" />
        </div>
        <h2 class="font-semibold text-lg">Pas encore de voyage</h2>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs mx-auto">Crée ton premier voyage ou importe un export JSON.</p>
        <div class="flex gap-2 justify-center mt-5">
          <button @click="showImport = true" class="btn-secondary">
            <Upload class="w-4 h-4" :stroke-width="2.5" />
            Importer
          </button>
          <button @click="showCreate = true" class="btn-accent">
            <Plus class="w-4 h-4" :stroke-width="2.5" />
            Créer
          </button>
        </div>
      </div>

      <ul v-else class="space-y-3 mt-1">
        <li v-for="t in sortedTrips" :key="t.id">
          <article class="card-hover overflow-hidden">
            <button @click="open(t)" class="w-full text-left flex">
              <div class="w-24 sm:w-28 flex-shrink-0 relative aspect-square">
                <img
                  v-if="t.coverImage"
                  :src="t.coverImage"
                  :alt="t.name"
                  class="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  @error="$event.target.style.display='none'"
                />
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center bg-gradient-to-br text-white"
                  :class="tripGradient(t)"
                >
                  <Plane class="w-8 h-8" :stroke-width="1.5" />
                </div>
                <span v-if="roleOf(t) === 'owner'" class="absolute top-1.5 left-1.5 chip bg-white/90 text-amber-700 ring-amber-200 backdrop-blur">
                  <Crown class="w-3 h-3" :stroke-width="2" />
                </span>
                <span v-else-if="roleOf(t) === 'editor'" class="absolute top-1.5 left-1.5 chip bg-white/90 text-sky-700 ring-sky-200 backdrop-blur">
                  <Pencil class="w-3 h-3" :stroke-width="2" />
                </span>
              </div>
              <div class="flex-1 min-w-0 p-3.5 flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <h2 class="font-semibold text-[16px] truncate tracking-tight">{{ t.name }}</h2>
                  <p v-if="t.destination" class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate flex items-center gap-1">
                    <MapPin class="w-3 h-3" :stroke-width="2" />
                    {{ t.destination }}<span v-if="t.country">, {{ t.country }}</span>
                  </p>
                  <p v-if="t.startDate" class="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                    <Calendar class="w-3 h-3" :stroke-width="2" />
                    {{ formatDate(t.startDate, 'd MMM') }}<span v-if="t.endDate"> → {{ formatDate(t.endDate, 'd MMM yyyy') }}</span>
                  </p>
                  <div v-if="t.currencySymbol" class="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {{ t.currencySymbol }} · {{ t.currency }}
                  </div>
                </div>
                <ChevronRight class="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" :stroke-width="2" />
              </div>
            </button>
            <div v-if="roleOf(t) === 'owner'" class="border-t border-slate-100 dark:border-slate-800 px-3 py-1.5 flex justify-end">
              <button @click="confirmDelete(t, $event)" class="text-[11px] text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 flex items-center gap-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/50 transition">
                <Trash2 class="w-3 h-3" :stroke-width="2" />
                Supprimer
              </button>
            </div>
          </article>
        </li>
      </ul>
    </section>

    <button
      v-if="sortedTrips.length > 0"
      @click="showCreate = true"
      class="fixed bottom-6 right-6 z-10 w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-95 transition"
      aria-label="Nouveau voyage"
    >
      <Plus class="w-6 h-6" :stroke-width="2.5" />
    </button>

    <ImportDialog v-model="showImport" @imported="onImported" />
    <TripFormSheet v-model="showCreate" @saved="onCreated" />
  </main>
</template>
