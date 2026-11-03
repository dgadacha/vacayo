<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, markRaw, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useActivitiesStore } from '@/stores/activities'
import { useAiStore } from '@/stores/ai'
import TripSummary from '@/components/TripSummary.vue'
import FilterBar from '@/components/FilterBar.vue'
import ActivityFormSheet from '@/components/ActivityFormSheet.vue'
import ActivityDetailSheet from '@/components/ActivityDetailSheet.vue'
import ItemsTab from '@/components/tabs/ItemsTab.vue'
import CalendarTab from '@/components/tabs/CalendarTab.vue'
import MapTab from '@/components/tabs/MapTab.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import LongPressHint from '@/components/LongPressHint.vue'
import AiAssistantSheet from '@/components/ai/AiAssistantSheet.vue'
import AiImportSheet from '@/components/ai/AiImportSheet.vue'
import AiSuggestSheet from '@/components/ai/AiSuggestSheet.vue'
import AiPlanSheet from '@/components/ai/AiPlanSheet.vue'
import AiTripGeneratorSheet from '@/components/ai/AiTripGeneratorSheet.vue'
import { ChevronLeft, Sparkles, Ellipsis, Plus, BedDouble, UtensilsCrossed, Ticket, CalendarDays, Map } from 'lucide-vue-next'
import { colorFromString, formatDate, tripStatus } from '@/utils/helpers'
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
const showGenerator = ref(false)

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
function openGenerator() {
  if (!canEdit.value) return
  if (!ai.requireReady()) return
  showGenerator.value = true
}

provide('trip', trip)
provide('canEdit', canEdit)
provide('openTripEditor', () => { if (canEdit.value) showEditTrip.value = true })
provide('aiActions', {
  openChat,
  openPlan,
  openGenerator,
  openSuggest: () => { if (ai.requireReady()) showSuggest.value = true },
  openImport: () => { if (ai.requireReady()) showAiImport.value = true }
})

const TABS = [
  { key: 'hotels', label: 'Hôtels', icon: BedDouble, type: 'hotel' },
  { key: 'restaurants', label: 'Restos', icon: UtensilsCrossed, type: 'restaurant' },
  { key: 'activities', label: 'Activités', icon: Ticket, type: 'activity' },
  { key: 'calendar', label: 'Planning', icon: CalendarDays, component: markRaw(CalendarTab) },
  { key: 'map', label: 'Carte', icon: Map, component: markRaw(MapTab) }
]

const currentTab = computed(() => TABS.find(t => t.key === activeTab.value) || TABS[0])
const currentTabIdx = computed(() => TABS.findIndex(t => t.key === activeTab.value))
const isMap = computed(() => activeTab.value === 'map')
const defaultType = computed(() => currentTab.value.type || 'activity')
const tripGradient = computed(() => colorFromString(trip.value?.name || ''))
const showLongPressHint = computed(() => !!currentTab.value.type)
const status = computed(() => trip.value ? tripStatus(trip.value) : null)
const memberCount = computed(() => Object.keys(trip.value?.members || {}).length)

// ---- Navigation bar: transparent over the cover, translucent material once scrolled past it
const HERO_H = 320
const scrolled = ref(false)
function onScroll() { scrolled.value = window.scrollY > HERO_H - 110 }
const solidHeader = computed(() => scrolled.value || isMap.value)

const tabTransition = ref('tab-fwd')
function setTab(key) {
  if (key === activeTab.value) {
    window.scrollTo({ top: 0, behavior: 'smooth' }) // iOS: tapping the active tab scrolls to top
    return
  }
  const newIdx = TABS.findIndex(t => t.key === key)
  tabTransition.value = newIdx > currentTabIdx.value ? 'tab-fwd' : 'tab-bwd'
  activeTab.value = key
  // Keep the cover collapsed if it already was, so the new tab starts at its top
  const stick = HERO_H - 100
  if (window.scrollY > stick) window.scrollTo({ top: stick })
}

// Swipe left/right on the content to change tab (not on the map, rows or horizontal strips)
const tabSwipe = { x: 0, y: 0, t: 0, active: false }
function onTabSwipeStart(e) {
  if (e.target.closest('.leaflet-container, [data-no-swipe], .van-swipe-cell')) return
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
  return `${formatDate(t.startDate, 'd MMM')}${t.endDate ? ' – ' + formatDate(t.endDate, 'd MMM yyyy') : ''}`
})
const kicker = computed(() => {
  const parts = [status.value?.label]
  if (memberCount.value > 1) parts.push(`${memberCount.value} voyageurs`)
  if (role.value === 'viewer') parts.push('Lecture seule')
  return parts.filter(Boolean).join(' · ')
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
  // Coming from "Nouveau voyage" with "Préparer avec l'IA" on
  if (route.query.generate) {
    router.replace({ query: {} })
    openGenerator()
  }
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

// ---- "+" in the navigation bar: manual add or AI helpers
const showAddMenu = ref(false)
const ADD_LABEL = { hotel: 'Nouvel hôtel', restaurant: 'Nouveau restaurant', activity: 'Nouvelle activité' }
const IDEAS_LABEL = { hotel: 'Idées d’hôtels', restaurant: 'Idées de restos', activity: 'Idées d’activités' }
const addActions = computed(() => [
  { name: ADD_LABEL[defaultType.value], key: 'manual' },
  { name: 'Générer tout le voyage', subname: 'Étapes, hôtels et programme à partir des dates', key: 'ai-generate' },
  { name: 'Ajout magique', subname: 'Colle un mail de réservation, l’IA remplit les fiches', key: 'ai-import' },
  { name: IDEAS_LABEL[defaultType.value], subname: 'Suggestions de l’IA adaptées à tes étapes', key: 'ai-suggest' }
])
function onAddSelect(action) {
  showAddMenu.value = false
  if (action.key === 'manual') return openAdd(defaultType.value)
  if (!ai.requireReady()) return
  if (action.key === 'ai-generate') showGenerator.value = true
  else if (action.key === 'ai-import') showAiImport.value = true
  else if (action.key === 'ai-suggest') showSuggest.value = true
}
function onAdd() {
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
  a.push({ name: `Exporter (${activities.all.length} éléments)`, key: 'export' })
  if (trips.isOwner(trip.value)) a.push({ name: 'Supprimer le voyage', key: 'delete', color: 'var(--vc-red)' })
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
  <div>
  <div v-if="!trip" class="min-h-[100dvh]">
    <div class="shimmer !rounded-none" :style="{ height: HERO_H + 'px' }" />
    <div class="px-4 mt-4 space-y-3">
      <div class="shimmer h-28 !rounded-xl" />
      <div class="shimmer h-64 !rounded-xl" />
    </div>
  </div>

  <main v-else class="min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom)+5rem)]" style="overflow-x: clip; --vc-topbar-h: calc(env(safe-area-inset-top) + 44px)">
    <!-- Navigation bar -->
    <header class="fixed top-0 inset-x-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-200" :class="solidHeader ? 'material hairline-b' : ''">
      <div class="h-11 px-2 flex items-center gap-1.5 relative max-w-2xl mx-auto">
        <button v-if="solidHeader" type="button" class="flex items-center h-11 pr-2 text-tint active:opacity-40 -ml-1" aria-label="Retour aux voyages" @click="back">
          <ChevronLeft class="w-7 h-7" :stroke-width="2.4" />
          <span class="t-body -ml-0.5">Voyages</span>
        </button>
        <button v-else type="button" class="glass-btn" aria-label="Retour aux voyages" @click="back">
          <ChevronLeft class="w-5 h-5 -ml-0.5" :stroke-width="2.6" />
        </button>

        <p class="absolute inset-x-28 text-center t-headline truncate transition-opacity duration-200 pointer-events-none" :class="solidHeader ? 'opacity-100' : 'opacity-0'">{{ trip.name }}</p>

        <div class="ml-auto flex items-center gap-2">
          <button type="button" :class="solidHeader ? 'bar-btn' : 'glass-btn'" aria-label="Copilote IA" @click="openChat()">
            <Sparkles class="w-[18px] h-[18px]" :stroke-width="2.2" />
          </button>
          <button v-if="canEdit && !isMap" type="button" :class="solidHeader ? 'bar-btn' : 'glass-btn'" :aria-label="activeTab === 'calendar' ? 'Ajouter au planning' : 'Ajouter'" @click="onAdd">
            <Plus class="w-5 h-5" :stroke-width="2.4" />
          </button>
          <button type="button" :class="solidHeader ? 'bar-btn' : 'glass-btn'" aria-label="Options du voyage" @click="showMenu = true">
            <Ellipsis class="w-5 h-5" :stroke-width="2.4" />
          </button>
        </div>
      </div>
    </header>

    <div @touchstart.passive="onTabSwipeStart" @touchend.passive="onTabSwipeEnd" @touchcancel.passive="onTabSwipeEnd">
      <!-- Cover -->
      <template v-if="!isMap">
        <section class="relative text-white overflow-hidden" :style="{ height: HERO_H + 'px' }">
          <div class="absolute inset-0 bg-gradient-to-br" :class="tripGradient" />
          <img v-if="trip.coverImage" :src="trip.coverImage" :alt="trip.name" class="absolute inset-0 w-full h-full object-cover" @error="$event.target.style.display = 'none'" />
          <div class="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/75" />
          <div class="absolute inset-x-0 bottom-0 px-4 pb-5 max-w-2xl mx-auto">
            <p v-if="kicker" class="t-footnote font-semibold uppercase text-white/75">{{ kicker }}</p>
            <h1 class="t-large [text-wrap:balance]">{{ trip.name }}</h1>
            <p v-if="place || dates" class="t-subhead text-white/85 truncate">{{ [place, dates].filter(Boolean).join(' · ') }}</p>
          </div>
        </section>
        <div class="max-w-2xl mx-auto pt-4">
          <TripSummary @plan="openPlan" @generate="openGenerator" />
        </div>
      </template>
      <div v-else :style="{ height: 'var(--vc-topbar-h)' }" />

      <div class="max-w-2xl mx-auto">
        <FilterBar v-if="currentTab.type" :type="currentTab.type" class="mt-6" />

        <Transition :name="tabTransition" mode="out-in">
          <ItemsTab v-if="currentTab.type" :key="currentTab.key" :type="currentTab.type" :on-edit="openEdit" :on-view="openView" :on-add="() => openAdd(currentTab.type)" />
          <component :is="currentTab.component" v-else :key="currentTab.key" :on-edit="openEdit" :on-view="openView" />
        </Transition>
      </div>
    </div>

    <!-- Tab bar -->
    <nav class="fixed bottom-0 inset-x-0 z-30 material hairline-t pb-[env(safe-area-inset-bottom)]" aria-label="Sections du voyage">
      <div class="flex max-w-2xl mx-auto">
        <button
          v-for="t in TABS"
          :key="t.key"
          type="button"
          class="flex-1 h-[49px] pt-1 flex flex-col items-center justify-start gap-[3px] active:opacity-50"
          :style="{ color: activeTab === t.key ? 'var(--vc-primary)' : 'var(--vc-gray)' }"
          :aria-current="activeTab === t.key ? 'page' : undefined"
          @click="setTab(t.key)"
        >
          <component :is="t.icon" class="w-[25px] h-[25px]" :stroke-width="activeTab === t.key ? 2.2 : 1.8" />
          <span class="text-[10px] leading-3 font-medium">{{ t.label }}</span>
        </button>
      </div>
    </nav>

    <LongPressHint :active="showLongPressHint" />

    <van-action-sheet v-model:show="showAddMenu" :actions="addActions" cancel-text="Annuler" teleport="body" close-on-click-action @select="onAddSelect" />
    <van-action-sheet v-model:show="showMenu" :title="trip.name" :actions="menuActions" cancel-text="Annuler" teleport="body" close-on-click-action @select="onMenuSelect" />

    <ActivityFormSheet v-model="showSheet" :activity="editing" :default-type="defaultType" />
    <ActivityDetailSheet v-model="showDetail" :activity="viewing" @edit="openEdit" />
    <TripFormSheet v-model="showEditTrip" :trip="trip" @saved="onTripSaved" />

    <AiAssistantSheet v-model="showChat" :initial-prompt="chatPrompt" />
    <AiImportSheet v-model="showAiImport" />
    <AiSuggestSheet v-model="showSuggest" :type="defaultType" />
    <AiPlanSheet v-model="showPlan" />
    <AiTripGeneratorSheet v-model="showGenerator" />
  </main>
  </div>
</template>

<style scoped>
.tab-fwd-enter-active, .tab-fwd-leave-active,
.tab-bwd-enter-active, .tab-bwd-leave-active {
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease;
}
.tab-fwd-enter-from { transform: translateX(12%); opacity: 0; }
.tab-fwd-leave-to { transform: translateX(-6%); opacity: 0; }
.tab-bwd-enter-from { transform: translateX(-12%); opacity: 0; }
.tab-bwd-leave-to { transform: translateX(6%); opacity: 0; }
</style>
