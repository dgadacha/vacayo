<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { formatDate, colorFromString, tripStatus } from '@/utils/helpers'
import { useScrolled } from '@/composables/useScrolled'
import ImportDialog from '@/components/ImportDialog.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import AccountSheet from '@/components/AccountSheet.vue'
import TripStatusChip from '@/components/TripStatusChip.vue'
import { useToast } from '@/composables/useToast'
import { Plus, ChevronRight, Users, Eye, Luggage } from 'lucide-vue-next'

const router = useRouter()
const trips = useTripsStore()
const auth = useAuthStore()
const toast = useToast()
const collapsed = useScrolled(44)

const showCreate = ref(false)
const showImport = ref(false)
const showAccount = ref(false)

const loading = computed(() => trips.loading && trips.trips.length === 0)
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
  return `${formatDate(t.startDate, sameYear ? 'd MMM' : 'd MMM yyyy')}${t.endDate ? ' – ' + formatDate(t.endDate, 'd MMM yyyy') : ''}`
}
function memberCount(t) { return Object.keys(t.members || {}).length }
function featuredKicker(t) {
  if (t.status.state === 'ongoing') return `En ce moment · ${t.status.label}`
  return `Prochain départ · ${t.status.label}`
}

function open(t) { router.push({ name: 'trip', params: { id: t.id } }) }
function hideImg(e) { e.target.style.display = 'none' }

function onCreated(t) {
  toast.success(`« ${t.name} » créé`)
  router.push({ name: 'trip', params: { id: t.id } })
}
function onImported(res) {
  toast.success(`${res.count} éléments importés`)
  router.push({ name: 'trip', params: { id: res.tripId } })
}
</script>

<template>
  <main class="min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
    <!-- Navigation bar: transparent over the large title, translucent once it scrolls away -->
    <header class="fixed top-0 inset-x-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-200" :class="collapsed ? 'material hairline-b' : ''">
      <div class="h-11 px-2 flex items-center justify-end relative max-w-2xl mx-auto">
        <p class="absolute inset-x-16 text-center t-headline transition-opacity duration-200 pointer-events-none" :class="collapsed ? 'opacity-100' : 'opacity-0'">Voyages</p>
        <button type="button" class="btn-icon" aria-label="Nouveau voyage" @click="showCreate = true">
          <Plus class="w-[26px] h-[26px]" :stroke-width="2.2" />
        </button>
      </div>
    </header>

    <div class="pt-[calc(env(safe-area-inset-top)+44px)] max-w-2xl mx-auto">
      <!-- Large title -->
      <div class="px-4 pt-1 pb-3 flex items-end justify-between gap-3">
        <div>
          <p class="t-footnote font-semibold uppercase text-muted">{{ formatDate(new Date(), 'EEEE d MMMM') }}</p>
          <h1 class="t-large">Voyages</h1>
        </div>
        <button type="button" class="w-9 h-9 mb-1 rounded-full flex items-center justify-center text-white t-headline flex-shrink-0 bg-gradient-to-b from-[#a1a1a6] to-[#7c7c80]" aria-label="Mon compte" @click="showAccount = true">
          {{ initial }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="px-4 space-y-3">
        <div class="shimmer h-[380px] !rounded-[20px]" />
        <div class="shimmer h-36 !rounded-xl" />
      </div>

      <!-- Empty -->
      <div v-else-if="trips.trips.length === 0" class="px-8 pt-16 text-center">
        <div class="inline-flex w-20 h-20 rounded-[22px] items-center justify-center text-white bg-gradient-to-b from-[#5ac8fa] to-[#007aff] shadow-lift">
          <Luggage class="w-10 h-10" :stroke-width="1.6" />
        </div>
        <h2 class="t-title2 mt-6">Aucun voyage</h2>
        <p class="t-subhead text-muted mt-2">Crée ton premier voyage pour y ranger hôtels, restos et activités, puis invite tes compagnons de route.</p>
        <button type="button" class="btn btn-primary w-full mt-8" @click="showCreate = true">Créer un voyage</button>
        <button type="button" class="btn btn-plain w-full mt-1" @click="showImport = true">Importer un fichier</button>
      </div>

      <template v-else>
        <!-- Featured: App Store "Today" card -->
        <div v-if="featured" class="px-4 mb-8">
          <button type="button" class="block w-full text-left rounded-[20px] overflow-hidden relative h-[400px] shadow-lift active:scale-[0.97] transition-transform duration-300" @click="open(featured)">
            <div class="absolute inset-0 bg-gradient-to-br" :class="tripGradient(featured)" />
            <img v-if="featured.coverImage" :src="featured.coverImage" :alt="featured.name" class="absolute inset-0 w-full h-full object-cover" @error="hideImg" />
            <div class="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
            <div class="absolute top-0 inset-x-0 p-5 text-white">
              <p class="t-footnote font-semibold uppercase text-white/75">{{ featuredKicker(featured) }}</p>
              <h2 class="t-title1 mt-1 [text-wrap:balance]">{{ featured.name }}</h2>
            </div>
            <div class="absolute bottom-0 inset-x-0 px-5 py-4 text-white flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <p v-if="place(featured)" class="t-headline truncate">{{ place(featured) }}</p>
                <p v-if="dates(featured)" class="t-subhead text-white/80 truncate">{{ dates(featured) }}</p>
              </div>
              <span v-if="memberCount(featured) > 1" class="chip material !bg-white/25 text-white"><Users class="w-3 h-3" :stroke-width="2.4" />{{ memberCount(featured) }}</span>
              <span class="btn btn-sm !h-8 !text-[15px] bg-white/90 text-[#007aff] !font-bold">Ouvrir</span>
            </div>
          </button>
        </div>

        <!-- Other trips: inset grouped lists -->
        <section v-for="s in sections" :key="s.key" class="mb-8">
          <h3 class="list-header">{{ s.title }}</h3>
          <div class="list" style="--sep-inset: 84px">
            <button v-for="t in s.items" :key="t.id" type="button" class="row !py-2.5" @click="open(t)">
              <div class="w-14 h-14 rounded-[10px] overflow-hidden relative flex-shrink-0 bg-gradient-to-br" :class="tripGradient(t)">
                <img v-if="t.coverImage" :src="t.coverImage" :alt="t.name" class="absolute inset-0 w-full h-full object-cover" loading="lazy" @error="hideImg" />
                <span v-else class="absolute inset-0 flex items-center justify-center text-white t-title2">{{ (t.name || '?').charAt(0).toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="t-headline truncate">{{ t.name }}</p>
                <p v-if="place(t)" class="t-subhead text-muted truncate">{{ place(t) }}</p>
                <p v-if="dates(t)" class="t-footnote text-muted truncate">{{ dates(t) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <TripStatusChip :trip="t" />
                <span v-if="trips.roleOf(t) === 'viewer'" class="t-caption text-muted flex items-center gap-1"><Eye class="w-3 h-3" :stroke-width="2" />Lecture</span>
              </div>
              <ChevronRight class="w-4 h-4 text-subtle flex-shrink-0 -mr-1" :stroke-width="2.5" />
            </button>
          </div>
        </section>
      </template>
    </div>

    <ImportDialog v-model="showImport" @imported="onImported" />
    <TripFormSheet v-model="showCreate" @saved="onCreated" />
    <AccountSheet v-model="showAccount" @import="showImport = true" />
  </main>
</template>
