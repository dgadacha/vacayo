<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, markRaw, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useActivitiesStore } from '@/stores/activities'
import DashboardStats from '@/components/DashboardStats.vue'
import BudgetBar from '@/components/BudgetBar.vue'
import FilterBar from '@/components/FilterBar.vue'
import ActivityFormSheet from '@/components/ActivityFormSheet.vue'
import ActivityDetailSheet from '@/components/ActivityDetailSheet.vue'
import HotelsTab from '@/components/tabs/HotelsTab.vue'
import RestaurantsTab from '@/components/tabs/RestaurantsTab.vue'
import ActivitiesTab from '@/components/tabs/ActivitiesTab.vue'
import CalendarTab from '@/components/tabs/CalendarTab.vue'
import MapTab from '@/components/tabs/MapTab.vue'
import Skeleton from '@/components/Skeleton.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import LongPressHint from '@/components/LongPressHint.vue'
import { ArrowLeft, Plus, BedDouble, UtensilsCrossed, Compass, CalendarDays, Map, Plane, MapPin, Lock, MoreVertical, Download, Pencil, Trash2 } from 'lucide-vue-next'
import { colorFromString, formatDate } from '@/utils/helpers'
import { exportTrip, downloadJson, safeFilename } from '@/services/transfer'
import { prewarm as prewarmGeocode } from '@/services/geocode'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const props = defineProps({ id: String })
const route = useRoute()
const router = useRouter()
const trips = useTripsStore()
const activities = useActivitiesStore()
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

provide('trip', trip)
provide('canEdit', canEdit)
provide('openTripEditor', () => { if (canEdit.value) showEditTrip.value = true })

const TABS = [
  { key: 'hotels', label: 'Hôtels', icon: BedDouble, component: markRaw(HotelsTab), defaultType: 'hotel', filterType: 'hotel' },
  { key: 'restaurants', label: 'Restos', icon: UtensilsCrossed, component: markRaw(RestaurantsTab), defaultType: 'restaurant', filterType: 'restaurant' },
  { key: 'activities', label: 'Activités', icon: Compass, component: markRaw(ActivitiesTab), defaultType: 'activity', filterType: 'activity' },
  { key: 'calendar', label: 'Planning', icon: CalendarDays, component: markRaw(CalendarTab), defaultType: 'activity', filterType: null }
  // { key: 'map', label: 'Carte', icon: Map, component: markRaw(MapTab), defaultType: 'activity', filterType: null }
]

const currentTab = computed(() => TABS.find(t => t.key === activeTab.value) || TABS[0])
const currentTabIdx = computed(() => TABS.findIndex(t => t.key === activeTab.value))
const tripGradient = computed(() => colorFromString(trip.value?.name || ''))
const showLongPressHint = computed(() => ['hotels', 'restaurants', 'activities'].includes(activeTab.value))

const tabTransition = ref('tab-fwd')
function setTab(key) {
  const newIdx = TABS.findIndex(t => t.key === key)
  tabTransition.value = newIdx > currentTabIdx.value ? 'tab-fwd' : 'tab-bwd'
  activeTab.value = key
}

// Tab swipe (left/right) on the content area — works on every tab
const tabSwipe = { x: 0, y: 0, t: 0, active: false }
function onTabSwipeStart(e) {
  const t = e.touches[0]
  tabSwipe.x = t.clientX
  tabSwipe.y = t.clientY
  tabSwipe.t = Date.now()
  tabSwipe.active = true
}
function onTabSwipeEnd(e) {
  if (!tabSwipe.active) return
  tabSwipe.active = false
  const t = e.changedTouches[0]
  const dx = t.clientX - tabSwipe.x
  const dy = t.clientY - tabSwipe.y
  const elapsed = Date.now() - tabSwipe.t
  if (Math.abs(dy) > 60) return
  if (Math.abs(dx) < 80) return
  if (elapsed > 600) return
  const idx = currentTabIdx.value
  if (dx < 0 && idx < TABS.length - 1) setTab(TABS[idx + 1].key)
  else if (dx > 0 && idx > 0) setTab(TABS[idx - 1].key)
}

const headerLine = computed(() => {
  if (!trip.value) return ''
  const parts = []
  if (trip.value.destination) parts.push(trip.value.destination)
  if (trip.value.country && trip.value.country !== trip.value.destination) parts.push(trip.value.country)
  return parts.join(', ')
})

async function ensureTrip(id) {
  if (!id) return
  if (trips.getById(id)) return
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

onBeforeUnmount(() => activities.teardown())

function openAdd() {
  if (!canEdit.value) { toast.error('Tu as un accès en lecture seule'); return }
  editing.value = null
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

const showMenu = ref(false)
const showEditTrip = ref(false)
function toggleMenu() { showMenu.value = !showMenu.value }
function closeMenu() { showMenu.value = false }

function handleExport() {
  if (!trip.value) return
  const payload = exportTrip(trip.value, activities.all)
  downloadJson(safeFilename(trip.value.name), payload)
  toast.success(`Voyage exporté (${activities.all.length} items)`)
  closeMenu()
}

function handleEditTrip() {
  if (!canEdit.value) return
  showEditTrip.value = true
  closeMenu()
}

function onTripSaved(t) {
  if (fallbackTrip.value) fallbackTrip.value = { ...fallbackTrip.value, ...t }
  toast.success('Voyage mis à jour')
}

async function handleDeleteTrip() {
  if (!trips.isOwner(trip.value)) { toast.error('Seul le propriétaire peut supprimer'); return }
  closeMenu()
  const ok = await confirm({
    title: `Supprimer "${trip.value.name}" ?`,
    message: 'Les activités liées resteront en base. Cette action est irréversible.',
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
  <Skeleton v-if="!trip" variant="trip-detail" />
  <main v-else class="min-h-screen pb-28 bg-slate-50 dark:bg-slate-950 overflow-x-clip">
    <header class="sticky top-0 z-20 bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/70 safe-top">
      <div class="max-w-2xl mx-auto px-3 py-2.5 flex items-center gap-2">
        <button @click="back" class="btn-icon" aria-label="Retour">
          <ArrowLeft class="w-5 h-5" :stroke-width="2" />
        </button>
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 relative">
            <img v-if="trip.coverImage" :src="trip.coverImage" :alt="trip.name" class="absolute inset-0 w-full h-full object-cover" @error="$event.target.style.display='none'" />
            <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br text-white" :class="tripGradient">
              <Plane class="w-4 h-4" :stroke-width="2" />
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="font-semibold tracking-tight truncate leading-tight text-[15px]">{{ trip.name }}</h1>
            <div class="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <MapPin v-if="headerLine" class="w-3 h-3 flex-shrink-0" :stroke-width="2" />
              <span class="truncate">{{ headerLine }}</span>
              <span v-if="trip.startDate" class="text-slate-300 dark:text-slate-600">·</span>
              <span v-if="trip.startDate" class="whitespace-nowrap">{{ formatDate(trip.startDate, 'd MMM') }}<span v-if="trip.endDate"> → {{ formatDate(trip.endDate, 'd MMM') }}</span></span>
            </div>
          </div>
          <span v-if="role === 'viewer'" class="chip bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
            <Lock class="w-3 h-3" :stroke-width="2" />
            Lecture
          </span>
          <div class="relative">
            <button @click="toggleMenu" class="btn-icon" aria-label="Menu">
              <MoreVertical class="w-5 h-5" :stroke-width="2" />
            </button>
            <Transition name="fade">
              <div v-if="showMenu" class="absolute right-0 top-full mt-1 z-40 w-56 card !rounded-xl shadow-lg p-1">
                <button v-if="canEdit" @click="handleEditTrip" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-sm">
                  <Pencil class="w-4 h-4 text-slate-500 dark:text-slate-400" :stroke-width="2" />
                  <span>Modifier le voyage</span>
                </button>
                <button @click="handleExport" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 text-sm">
                  <Download class="w-4 h-4 text-slate-500 dark:text-slate-400" :stroke-width="2" />
                  <span>Exporter en JSON</span>
                  <span class="ml-auto text-[10px] text-slate-400">{{ activities.all.length }}</span>
                </button>
                <div v-if="trips.isOwner(trip)" class="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                <button v-if="trips.isOwner(trip)" @click="handleDeleteTrip" class="w-full text-left px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <Trash2 class="w-4 h-4" :stroke-width="2" />
                  <span>Supprimer le voyage</span>
                </button>
              </div>
            </Transition>
            <div v-if="showMenu" class="fixed inset-0 z-30" @click="closeMenu" />
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto" @touchstart.passive="onTabSwipeStart" @touchend.passive="onTabSwipeEnd" @touchcancel.passive="onTabSwipeEnd">
      <template v-if="currentTab.key !== 'map'">
        <DashboardStats />
        <BudgetBar />
      </template>
      <FilterBar v-if="currentTab.filterType" :type="currentTab.filterType" />
      <Transition :name="tabTransition" mode="out-in">
        <component :is="currentTab.component" :key="currentTab.key" :on-edit="openEdit" :on-view="openView" />
      </Transition>
    </div>

    <van-tabbar
      :model-value="activeTab"
      @change="setTab"
      active-color="var(--van-text-color)"
      inactive-color="var(--van-text-color-3)"
      safe-area-inset-bottom
      placeholder
    >
      <van-tabbar-item v-for="t in TABS" :key="t.key" :name="t.key">
        <span class="!text-[10px] !font-semibold !tracking-tight">{{ t.label }}</span>
        <template #icon>
          <component :is="t.icon" class="w-[22px] h-[22px]" :stroke-width="activeTab === t.key ? 2.25 : 1.75" />
        </template>
      </van-tabbar-item>
    </van-tabbar>

    <button
      v-if="canEdit && currentTab.key !== 'map'"
      @click="openAdd"
      class="fixed bottom-[4.5rem] right-4 z-30 w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/25 flex items-center justify-center hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-95 transition"
      :aria-label="`Ajouter ${currentTab.label.toLowerCase()}`"
    >
      <Plus class="w-6 h-6" :stroke-width="2.5" />
    </button>

    <LongPressHint :active="showLongPressHint" />

    <ActivityFormSheet
      v-model="showSheet"
      :activity="editing"
      :default-type="currentTab.defaultType"
    />

    <ActivityDetailSheet
      v-model="showDetail"
      :activity="viewing"
      @edit="openEdit"
    />

    <TripFormSheet
      v-model="showEditTrip"
      :trip="trip"
      @saved="onTripSaved"
    />
  </main>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

.tab-fwd-enter-active, .tab-fwd-leave-active,
.tab-bwd-enter-active, .tab-bwd-leave-active {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.18s ease;
}
.tab-fwd-enter-from { transform: translateX(24%); opacity: 0; }
.tab-fwd-leave-to { transform: translateX(-12%); opacity: 0; }
.tab-bwd-enter-from { transform: translateX(-24%); opacity: 0; }
.tab-bwd-leave-to { transform: translateX(12%); opacity: 0; }
</style>
