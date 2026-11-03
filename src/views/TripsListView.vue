<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { formatDate, colorFromString, tripStatus } from '@/utils/helpers'
import ImportDialog from '@/components/ImportDialog.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import AccountSheet from '@/components/AccountSheet.vue'
import TripStatusChip from '@/components/TripStatusChip.vue'
import AppLogo from '@/components/AppLogo.vue'
import FabButton from '@/components/FabButton.vue'
import { useToast } from '@/composables/useToast'
import { MapPin, Plus, Upload, Plane, Eye, Users } from 'lucide-vue-next'

const router = useRouter()
const trips = useTripsStore()
const auth = useAuthStore()
const toast = useToast()

const showCreate = ref(false)
const showImport = ref(false)
const showAccount = ref(false)

const loading = computed(() => trips.loading && trips.trips.length === 0)
const firstName = computed(() => (auth.user?.name || '').split(/[\s.]/)[0])
const initial = computed(() => (auth.user?.name || '?').charAt(0).toUpperCase())

const withStatus = computed(() => trips.trips.map(t => ({ ...t, status: tripStatus(t) })))

// The trip that deserves the big card: the one in progress, else the next one.
const featured = computed(() => {
  const list = withStatus.value
  return list.find(t => t.status.state === 'ongoing')
    || list.filter(t => t.status.state === 'upcoming').sort((a, b) => a.status.daysUntil - b.status.daysUntil)[0]
    || null
})

const sections = computed(() => {
  const rest = withStatus.value.filter(t => t.id !== featured.value?.id)
  const by = s => rest.filter(t => t.status.state === s)
  return [
    { key: 'ongoing', title: 'En cours', items: by('ongoing') },
    { key: 'upcoming', title: 'À venir', items: by('upcoming').sort((a, b) => a.status.daysUntil - b.status.daysUntil) },
    { key: 'undated', title: 'Dates à définir', items: by('undated') },
    { key: 'past', title: 'Souvenirs', items: by('past').sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')) }
  ].filter(s => s.items.length)
})

function tripGradient(t) { return colorFromString(t.name || t.id) }
function place(t) { return [t.destination, t.country !== t.destination ? t.country : ''].filter(Boolean).join(', ') }
function dates(t) {
  if (!t.startDate) return ''
  const sameYear = (t.startDate || '').slice(0, 4) === (t.endDate || '').slice(0, 4)
  return `${formatDate(t.startDate, sameYear ? 'd MMM' : 'd MMM yyyy')}${t.endDate ? ' → ' + formatDate(t.endDate, 'd MMM yyyy') : ''}`
}
function roleLabel(t) {
  const r = trips.roleOf(t)
  return r === 'viewer' ? 'Lecture seule' : r === 'editor' ? 'Partagé' : ''
}
function memberCount(t) { return Object.keys(t.members || {}).length }

function open(t) { router.push({ name: 'trip', params: { id: t.id } }) }
function hideImg(e) { e.target.style.display = 'none' }

function onCreated(t) {
  toast.success(`Voyage « ${t.name} » créé`)
  router.push({ name: 'trip', params: { id: t.id } })
}
function onImported(res) {
  toast.success(`${res.count} éléments importés`)
  router.push({ name: 'trip', params: { id: res.tripId } })
}
</script>

<template>
  <main class="min-h-screen pb-28">
    <header class="sticky top-0 z-20 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-xl" style="background: color-mix(in srgb, var(--vc-bg) 85%, transparent)">
      <div class="flex items-center justify-between gap-3 max-w-2xl mx-auto">
        <div class="min-w-0">
          <p class="text-sm text-muted">Bonjour {{ firstName }} 👋</p>
          <h1 class="text-[28px] font-extrabold tracking-tight leading-tight">Mes voyages</h1>
        </div>
        <button type="button" class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-soft flex-shrink-0" style="background: var(--vc-ai)" aria-label="Mon compte" @click="showAccount = true">
          {{ initial }}
        </button>
      </div>
    </header>

    <div class="px-4 max-w-2xl mx-auto">
      <!-- Loading -->
      <div v-if="loading" class="space-y-3 pt-2">
        <div class="shimmer h-52 !rounded-3xl" />
        <div v-for="i in 2" :key="i" class="shimmer h-20 !rounded-2xl" />
      </div>

      <!-- Empty -->
      <div v-else-if="trips.trips.length === 0" class="pt-10 pb-6 text-center">
        <div class="relative inline-flex">
          <AppLogo :size="72" class="rounded-3xl shadow-lift" />
          <span class="absolute -right-3 -bottom-2 w-9 h-9 rounded-full card flex items-center justify-center">
            <Plane class="w-4 h-4" style="color: var(--vc-primary)" :stroke-width="2" />
          </span>
        </div>
        <h2 class="mt-6 text-xl font-bold">Ton premier voyage commence ici</h2>
        <p class="mt-2 text-sm text-muted max-w-xs mx-auto">Crée un voyage, ajoute tes hôtels, restos et activités, puis invite tes compagnons de route.</p>
        <div class="mt-6 flex gap-2 justify-center">
          <button type="button" class="btn btn-secondary" @click="showImport = true"><Upload class="w-4 h-4" :stroke-width="2" />Importer</button>
          <button type="button" class="btn btn-primary" @click="showCreate = true"><Plus class="w-4 h-4" :stroke-width="2.5" />Créer un voyage</button>
        </div>
      </div>

      <template v-else>
        <!-- Featured -->
        <button v-if="featured" type="button" class="block w-full text-left mt-1 mb-6 rounded-3xl overflow-hidden relative h-56 shadow-lift active:scale-[0.99] transition" @click="open(featured)">
          <div class="absolute inset-0 bg-gradient-to-br" :class="tripGradient(featured)" />
          <img v-if="featured.coverImage" :src="featured.coverImage" :alt="featured.name" class="absolute inset-0 w-full h-full object-cover" @error="hideImg" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
          <div class="absolute top-3 left-3 flex gap-2">
            <TripStatusChip :trip="featured" overlay />
            <span v-if="memberCount(featured) > 1" class="chip bg-white/20 text-white ring-white/30 backdrop-blur"><Users class="w-3 h-3" :stroke-width="2" />{{ memberCount(featured) }}</span>
          </div>
          <div class="absolute bottom-0 inset-x-0 p-5 text-white">
            <p class="text-xs font-semibold uppercase tracking-wider text-white/70">{{ featured.status.state === 'ongoing' ? 'En ce moment' : 'Prochain départ' }}</p>
            <h2 class="text-2xl font-extrabold tracking-tight leading-tight mt-0.5">{{ featured.name }}</h2>
            <p class="text-sm text-white/85 mt-1 flex items-center gap-1.5">
              <MapPin v-if="place(featured)" class="w-3.5 h-3.5" :stroke-width="2" />
              <span class="truncate">{{ place(featured) }}<span v-if="place(featured) && dates(featured)"> · </span>{{ dates(featured) }}</span>
            </p>
          </div>
        </button>

        <!-- Other trips -->
        <section v-for="s in sections" :key="s.key" class="mb-6">
          <h3 class="section-label px-1 mb-2">{{ s.title }}</h3>
          <div class="space-y-2.5">
            <button v-for="t in s.items" :key="t.id" type="button" class="card w-full flex items-center gap-3 p-2.5 pr-3.5 text-left active:scale-[0.99] transition" @click="open(t)">
              <div class="w-16 h-16 rounded-xl overflow-hidden relative flex-shrink-0 bg-gradient-to-br" :class="tripGradient(t)">
                <img v-if="t.coverImage" :src="t.coverImage" :alt="t.name" class="absolute inset-0 w-full h-full object-cover" loading="lazy" @error="hideImg" />
                <span v-else class="absolute inset-0 flex items-center justify-center text-white text-xl font-extrabold">{{ (t.name || '?').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-semibold truncate" :class="{ 'text-muted': s.key === 'past' }">{{ t.name }}</p>
                <p v-if="place(t)" class="text-[13px] text-muted truncate">{{ place(t) }}</p>
                <p v-if="dates(t)" class="text-xs text-subtle mt-0.5">{{ dates(t) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <TripStatusChip :trip="t" />
                <span v-if="roleLabel(t)" class="text-[10px] font-medium text-subtle flex items-center gap-1">
                  <Eye v-if="trips.roleOf(t) === 'viewer'" class="w-3 h-3" :stroke-width="2" />{{ roleLabel(t) }}
                </span>
              </div>
            </button>
          </div>
        </section>
      </template>
    </div>

    <FabButton v-if="trips.trips.length > 0" label="Nouveau voyage" @click="showCreate = true" />

    <ImportDialog v-model="showImport" @imported="onImported" />
    <TripFormSheet v-model="showCreate" @saved="onCreated" />
    <AccountSheet v-model="showAccount" @import="showImport = true" />
  </main>
</template>
