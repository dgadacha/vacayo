<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, markRaw, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useActivitiesStore } from '@/stores/activities'
import { useAiStore } from '@/stores/ai'
import TripSummary from '@/components/TripSummary.vue'
import TripStatusChip from '@/components/TripStatusChip.vue'
import FilterBar from '@/components/FilterBar.vue'
import ActivityFormSheet from '@/components/ActivityFormSheet.vue'
import ActivityDetailSheet from '@/components/ActivityDetailSheet.vue'
import ItemsTab from '@/components/tabs/ItemsTab.vue'
import CalendarTab from '@/components/tabs/CalendarTab.vue'
import MapTab from '@/components/tabs/MapTab.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import LongPressHint from '@/components/LongPressHint.vue'
import FabButton from '@/components/FabButton.vue'
import AiAssistantSheet from '@/components/ai/AiAssistantSheet.vue'
import AiImportSheet from '@/components/ai/AiImportSheet.vue'
import AiSuggestSheet from '@/components/ai/AiSuggestSheet.vue'
import AiPlanSheet from '@/components/ai/AiPlanSheet.vue'
import { ArrowLeft, Sparkles, MoreHorizontal, BedDouble, UtensilsCrossed, Compass, CalendarDays, Map, MapPin, Users, Eye } from 'lucide-vue-next'
import { colorFromString, formatDate } from '@/utils/helpers'
import { exportTrip, downloadJson, safeFilename } from '@/services/transfer'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const props = defineProps({ id: String })
const route = useRoute()
const router = useRouter()
const trips = useTripsStore()
const activities = useActivitiesStore()
const ai = useAiStore()
const toast = useToast()
const { confirm } = useConfirm()

const tripId = computed(() => props.id || route.params.id)
const fallbackTrip = ref(null)
const trip = computed(() => trips.getById(tripId.value) || fallbackTrip.value)
const activeTab = ref('hotels')
const showSheet = ref(false)
const showDetail = ref(false)
const editing = ref(null)
const viewing = ref(null)
const notFound = ref(false)

const canEdit = computed(() => trip.value ? trips.canEdit(trip.value) : false)
const role = computed(() => trip.value ? trips.roleOf(trip.value) : null)

// ---- AI sheets
const showChat = ref(false)
const chatPrompt = ref('')
const showAiImport = ref(false)
const showSuggest = ref(false)
const showPlan = ref(false)

function openChat(prompt = '') {
  if (!ai.requireReady()) return
  chatPrompt.value = prompt
  showChat.value = true
}
function openPlan() {
  if (!canEdit.value) return
  if (!ai.requireReady()) return
  showPlan.value = true
}

provide('trip', trip)
provide('canEdit', canEdit)
provide('openTripEditor', () => { if (canEdit.value) showEditTrip.value = true })
provide('aiActions', {
  openChat,
  openPlan,
  openSuggest: () => { if (ai.requireReady()) showSuggest.value = true },
  openImport: () => { if (ai.requireReady()) showAiImport.value = true }
})

const TABS = [
  { key: 'hotels', label: 'Hôtels', icon: BedDouble, type: 'hotel' },
  { key: 'restaurants', label: 'Restos', icon: UtensilsCrossed, type: 'restaurant' },
  { key: 'activities', label: 'Activités', icon: Compass, type: 'activity' },
  { key: 'calendar', label: 'Planning', icon: CalendarDays, component: markRaw(CalendarTab) },
  { key: 'map', label: 'Carte', icon: Map, component: markRaw(MapTab) }
]

const currentTab = computed(() => TABS.find(t => t.key === activeTab.value) || TABS[0])
const currentTabIdx = computed(() => TABS.findIndex(t => t.key === activeTab.value))
const isMap = computed(() => activeTab.value === 'map')
const defaultType = computed(() => currentTab.value.type || 'activity')
const tripGradient = computed(() => colorFromString(trip.value?.name || ''))
const showLongPressHint = computed(() => !!currentTab.value.type)
const memberCount = computed(() => Object.keys(trip.value?.members || {}).length)

// ---- Header: transparent over the cover, solid once scrolled past it
const HERO_H = 248
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > HERO_H - 90 }
const solidHeader = computed(() => scrolled.value || isMap.value)

const tabTransition = ref('tab-fwd')
function setTab(key) {
  if (key === activeTab.value) return
  const newIdx = TABS.findIndex(t => t.key === key)
  tabTransition.value = newIdx > currentTabIdx.value ? 'tab-fwd' : 'tab-bwd'
  activeTab.value = key
  // Keep the hero collapsed if it already was, so the new tab starts at its top
  const stick = HERO_H - 56
  if (window.scrollY > stick) window.scrollTo({ top: stick })
}

// Swipe left/right on the content to change tab (not on the map or horizontal strips)
const tabSwipe = { x: 0, y: 0, t: 0, active: false }
function onTabSwipeStart(e) {
  if (e.target.closest('.leaflet-container, [data-no-swipe]')) return
  const t = e.touches[0]
  Object.assign(tabSwipe, { x: t.clientX, y: t.clientY, t: Date.now(), active: true })
}
function onTabSwipeEnd(e) {
  if (!tabSwipe.active) return
  tabSwipe.active = false
  const t = e.changedTouches[0]
  const dx = t.clientX - tabSwipe.x
  const dy = t.clientY - tabSwipe.y
  if (Math.abs(dy) > 60 || Math.abs(dx) < 80 || Date.now() - tabSwipe.t > 600) return
  const idx = currentTabIdx.value
  if (dx < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1].key)
  else if (dx > 0 && idx > 0) setTab(TABS[idx - 1].key)
}

const place = computed(() => {
  const t = trip.value
  if (!t) return ''
  return [t.destination, t.country !== t.destination ? t.country : ''].filter(Boolean).join(', ')
})
const dates = computed(() => {
  const t = trip.value
  if (!t?.startDate) return ''
  return `${formatDate(t.startDate, 'd MMM')}${t.endDate ? ' → ' + formatDate(t.endDate, 'd MMM yyyy') : ''}`
})

async function ensureTrip(id) {
  if (!id || trips.getById(id)) return
  try {
    const t = await trips.fetchTripById(id)
    if (t) fallbackTrip.value = t
    else notFound.value = true
  } catch (e) {
    console.error(e)
    notFound.value = true
  }
}

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })
  await ensureTrip(tripId.value)
  if (notFound.value) {
    toast.error("Ce voyage n'existe plus ou tu n'y as plus accès")
    router.replace({ name: 'trips' })
    return
  }
  activities.setTrip(tripId.value)
})

watch(tripId, async (id) => {
  if (!id) return
  notFound.value = false
  fallbackTrip.value = null
  await ensureTrip(id)
  activities.setTrip(id)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  activities.teardown()
})

function openAdd(type) {
  if (!canEdit.value) { toast.error('Tu as un accès en lecture seule'); return }
  editing.value = type ? { type } : null
  showSheet.value = true
}
function openEdit(a) {
  if (!canEdit.value) { toast.error('Tu as un accès en lecture seule'); return }
  editing.value = a
  showSheet.value = true
}
function openView(a) {
  viewing.value = a
  showDetail.value = true
}
function back() { router.push({ name: 'trips' }) }

// ---- "+" button: manual add or AI helpers
const showAddMenu = ref(false)
const ADD_LABEL = { hotel: 'Ajouter un hôtel', restaurant: 'Ajouter un restaurant', activity: 'Ajouter une activité' }
const IDEAS_LABEL = { hotel: 'Idées d’hôtels', restaurant: 'Idées de restos', activity: 'Idées d’activités' }
const addActions = computed(() => [
  { name: ADD_LABEL[defaultType.value], key: 'manual' },
  { name: '✨ Ajout magique', subname: 'Colle un mail de réservation ou une liste, l’IA remplit les fiches', key: 'ai-import', color: 'var(--vc-primary)' },
  { name: `✨ ${IDEAS_LABEL[defaultType.value]}`, subname: 'Suggestions de l’IA adaptées à tes étapes', key: 'ai-suggest', color: 'var(--vc-primary)' }
])
function onAddSelect(action) {
  showAddMenu.value = false
  if (action.key === 'manual') return openAdd(defaultType.value)
  if (!ai.requireReady()) return
  if (action.key === 'ai-import') showAiImport.value = true
  else if (action.key === 'ai-suggest') showSuggest.value = true
}
function onFab() {
  if (!canEdit.value) { toast.error('Tu as un accès en lecture seule'); return }
  if (activeTab.value === 'calendar') return openAdd('activity')
  showAddMenu.value = true
}

// ---- Trip menu
const showMenu = ref(false)
const showEditTrip = ref(false)
const menuActions = computed(() => {
  const a = []
  if (canEdit.value) a.push({ name: 'Modifier le voyage', key: 'edit' })
  a.push({ name: `Exporter en JSON (${activities.all.length} éléments)`, key: 'export' })
  if (trips.isOwner(trip.value)) a.push({ name: 'Supprimer le voyage', key: 'delete', color: '#e11d48' })
  return a
})
function onMenuSelect(action) {
  showMenu.value = false
  if (action.key === 'edit') showEditTrip.value = true
  else if (action.key === 'export') handleExport()
  else if (action.key === 'delete') handleDeleteTrip()
}

function handleExport() {
  if (!trip.value) return
  downloadJson(safeFilename(trip.value.name), exportTrip(trip.value, activities.all))
  toast.success(`Voyage exporté (${activities.all.length} éléments)`)
}

function onTripSaved(t) {
  if (fallbackTrip.value) fallbackTrip.value = { ...fallbackTrip.value, ...t }
  toast.success('Voyage mis à jour')
}

async function handleDeleteTrip() {
  if (!trips.isOwner(trip.value)) { toast.error('Seul le propriétaire peut supprimer'); return }
  const ok = await confirm({
    title: `Supprimer « ${trip.value.name} » ?`,
    message: 'Le voyage disparaîtra pour tous ses membres. Cette action est irréversible.',
    confirmLabel: 'Supprimer',
    destructive: true
  })
  if (!ok) return
  try {
    await trips.deleteTrip(trip.value.id)
    toast.success('Voyage supprimé')
    router.replace({ name: 'trips' })
  } catch (e) {
    toast.error(e.message || 'Erreur lors de la suppression')
  }
}
</script>

<template>
  <div v-if="!trip" class="min-h-screen">
    <div class="shimmer !rounded-none h-[248px]" />
    <div class="px-4 -mt-8 space-y-3">
      <div class="shimmer h-24 !rounded-2xl" />
      <div v-for="i in 3" :key="i" class="shimmer h-24 !rounded-2xl" />
    </div>
  </div>

  <main v-else class="min-h-screen pb-[calc(env(safe-area-inset-bottom)+5.5rem)]" style="overflow-x: clip; --vc-topbar-h: calc(env(safe-area-inset-top) + 56px)">
    <!-- Top bar -->
    <header
      class="fixed top-0 inset-x-0 z-30 transition-colors duration-200"
      :class="solidHeader ? 'backdrop-blur-xl border-b' : ''"
      :style="solidHeader ? { background: 'color-mix(in srgb, var(--vc-bg) 88%, transparent)', borderColor: 'var(--vc-border-soft)' } : {}"
    >
      <div class="h-14 px-2 flex items-center gap-1 pt-[env(safe-area-inset-top)] box-content">
        <button type="button" class="btn-icon" :class="{ 'glass': !solidHeader }" aria-label="Retour aux voyages" @click="back">
          <ArrowLeft class="w-5 h-5" :stroke-width="2" />
        </button>
        <div class="flex-1 min-w-0 text-center transition-opacity duration-200" :class="solidHeader ? 'opacity-100' : 'opacity-0'">
          <p class="font-semibold text-[15px] truncate">{{ trip.name }}</p>
          <p v-if="dates" class="text-[11px] text-muted truncate -mt-0.5">{{ dates }}</p>
        </div>
        <button type="button" class="btn-icon" :class="{ 'glass': !solidHeader }" aria-label="Copilote IA" @click="openChat()">
          <Sparkles class="w-5 h-5" :class="solidHeader ? 'text-violet-500' : ''" :stroke-width="2" />
        </button>
        <button type="button" class="btn-icon" :class="{ 'glass': !solidHeader }" aria-label="Options du voyage" @click="showMenu = true">
          <MoreHorizontal class="w-5 h-5" :stroke-width="2" />
        </button>
      </div>
    </header>

    <div @touchstart.passive="onTabSwipeStart" @touchend.passive="onTabSwipeEnd" @touchcancel.passive="onTabSwipeEnd">
      <!-- Hero -->
      <template v-if="!isMap">
        <section class="relative text-white overflow-hidden" :style="{ height: HERO_H + 'px' }">
          <div class="absolute inset-0 bg-gradient-to-br" :class="tripGradient" />
          <img v-if="trip.coverImage" :src="trip.coverImage" :alt="trip.name" class="absolute inset-0 w-full h-full object-cover" @error="$event.target.style.display = 'none'" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/30" />
          <div class="absolute inset-x-0 bottom-0 px-5 pb-12">
            <div class="flex flex-wrap gap-1.5 mb-2">
              <TripStatusChip :trip="trip" overlay />
              <span v-if="memberCount > 1" class="chip bg-white/20 text-white ring-white/30 backdrop-blur"><Users class="w-3 h-3" :stroke-width="2" />{{ memberCount }} voyageurs</span>
              <span v-if="role === 'viewer'" class="chip bg-white/20 text-white ring-white/30 backdrop-blur"><Eye class="w-3 h-3" :stroke-width="2" />Lecture seule</span>
            </div>
            <h1 class="text-[28px] font-extrabold tracking-tight leading-tight">{{ trip.name }}</h1>
            <p v-if="place || dates" class="mt-1 text-sm text-white/85 flex items-center gap-1.5">
              <MapPin v-if="place" class="w-3.5 h-3.5 flex-shrink-0" :stroke-width="2" />
              <span class="truncate">{{ place }}<span v-if="place && dates"> · </span>{{ dates }}</span>
            </p>
          </div>
        </section>
        <div class="-mt-8">
          <TripSummary @plan="openPlan" />
        </div>
      </template>
      <div v-else :style="{ height: 'var(--vc-topbar-h)' }" />

      <FilterBar v-if="currentTab.type" :type="currentTab.type" class="mt-3" />

      <Transition :name="tabTransition" mode="out-in">
        <ItemsTab v-if="currentTab.type" :key="currentTab.key" :type="currentTab.type" :on-edit="openEdit" :on-view="openView" :on-add="() => openAdd(currentTab.type)" />
        <component :is="currentTab.component" v-else :key="currentTab.key" :on-edit="openEdit" :on-view="openView" />
      </Transition>
    </div>

    <!-- Bottom navigation -->
    <nav class="fixed bottom-0 inset-x-0 z-30 border-t backdrop-blur-xl pb-[env(safe-area-inset-bottom)]" style="background: color-mix(in srgb, var(--vc-surface) 92%, transparent); border-color: var(--vc-border-soft)" aria-label="Sections du voyage">
      <div class="flex max-w-2xl mx-auto">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="flex-1 h-[58px] flex flex-col items-center justify-center gap-0.5 transition"
          :style="{ color: activeTab === t.key ? 'var(--vc-primary)' : 'var(--vc-subtle)' }"
          :aria-current="activeTab === t.key ? 'page' : undefined"
          @click="setTab(t.key)"
        >
          <span class="w-12 h-7 rounded-full flex items-center justify-center transition" :style="activeTab === t.key ? { background: 'var(--vc-primary-soft)' } : {}">
            <component :is="t.icon" class="w-[20px] h-[20px]" :stroke-width="activeTab === t.key ? 2.25 : 1.75" />
          </span>
          <span class="text-[10.5px] font-semibold">{{ t.label }}</span>
        </button>
      </div>
    </nav>

    <FabButton v-if="canEdit && !isMap" :label="activeTab === 'calendar' ? 'Ajouter au planning' : 'Ajouter'" offset="5.25rem" @click="onFab" />

    <LongPressHint :active="showLongPressHint" />

    <van-action-sheet
      v-model:show="showAddMenu"
      :actions="addActions"
      cancel-text="Annuler"
      teleport="body"
      close-on-click-action
      @select="onAddSelect"
    />
    <van-action-sheet
      v-model:show="showMenu"
      :title="trip.name"
      :actions="menuActions"
      cancel-text="Annuler"
      teleport="body"
      close-on-click-action
      @select="onMenuSelect"
    />

    <ActivityFormSheet v-model="showSheet" :activity="editing" :default-type="defaultType" />
    <ActivityDetailSheet v-model="showDetail" :activity="viewing" @edit="openEdit" />
    <TripFormSheet v-model="showEditTrip" :trip="trip" @saved="onTripSaved" />

    <AiAssistantSheet v-model="showChat" :initial-prompt="chatPrompt" />
    <AiImportSheet v-model="showAiImport" />
    <AiSuggestSheet v-model="showSuggest" :type="defaultType" />
    <AiPlanSheet v-model="showPlan" />
  </main>
</template>

<style scoped>
.glass { background: rgb(0 0 0 / 0.32); color: #fff; backdrop-filter: blur(10px); }
.glass:hover { background: rgb(0 0 0 / 0.45); }

.tab-fwd-enter-active, .tab-fwd-leave-active,
.tab-bwd-enter-active, .tab-bwd-leave-active {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease;
}
.tab-fwd-enter-from { transform: translateX(16%); opacity: 0; }
.tab-fwd-leave-to { transform: translateX(-8%); opacity: 0; }
.tab-bwd-enter-from { transform: translateX(-16%); opacity: 0; }
.tab-bwd-leave-to { transform: translateX(8%); opacity: 0; }
</style>
