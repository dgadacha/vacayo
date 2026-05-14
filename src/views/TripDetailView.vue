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
  { key: 'hotels', label: 'Hôtels', icon: BedDouble, vanIcon: 'hotel-o', component: markRaw(HotelsTab), defaultType: 'hotel', filterType: 'hotel' },
  { key: 'restaurants', label: 'Restos', icon: UtensilsCrossed, vanIcon: 'cashier-o', component: markRaw(RestaurantsTab), defaultType: 'restaurant', filterType: 'restaurant' },
  { key: 'activities', label: 'Activités', icon: Compass, vanIcon: 'compass-o', component: markRaw(ActivitiesTab), defaultType: 'activity', filterType: 'activity' },
  { key: 'calendar', label: 'Planning', icon: CalendarDays, vanIcon: 'calendar-o', component: markRaw(CalendarTab), defaultType: 'activity', filterType: null }
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

const menuActions = computed(() => {
  const a = []
  if (canEdit.value) a.push({ text: 'Modifier le voyage', key: 'edit', icon: 'edit' })
  a.push({ text: `Exporter (${activities.all.length})`, key: 'export', icon: 'down' })
  if (trips.isOwner(trip.value)) a.push({ text: 'Supprimer', key: 'delete', icon: 'delete', color: '#dc2626' })
  return a
})

function onMenuSelect(action) {
  showMenu.value = false
  if (action.key === 'edit') handleEditTrip()
  else if (action.key === 'export') handleExport()
  else if (action.key === 'delete') handleDeleteTrip()
}

function handleExport() {
  if (!trip.value) return
  const payload = exportTrip(trip.value, activities.all)
  downloadJson(safeFilename(trip.value.name), payload)
  toast.success(`Voyage exporté (${activities.all.length} items)`)
}

function handleEditTrip() {
  if (!canEdit.value) return
  showEditTrip.value = true
}

function onTripSaved(t) {
  if (fallbackTrip.value) fallbackTrip.value = { ...fallbackTrip.value, ...t }
  toast.success('Voyage mis à jour')
}

async function handleDeleteTrip() {
  if (!trips.isOwner(trip.value)) { toast.error('Seul le propriétaire peut supprimer'); return }
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
  <main v-else class="min-h-screen pb-28" style="overflow-x: clip;">
    <van-nav-bar
      left-arrow
      @click-left="back"
      fixed placeholder safe-area-inset-top
    >
      <template #title>
        <div class="flex items-center justify-center gap-2 min-w-0">
          <van-image v-if="trip.coverImage" :src="trip.coverImage" width="28" height="28" radius="6" fit="cover" />
          <div v-else class="w-7 h-7 rounded-md flex items-center justify-center bg-gradient-to-br text-white text-[10px] font-bold" :class="tripGradient">
            {{ (trip.name || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0 text-left">
            <div class="text-sm font-semibold truncate">{{ trip.name }}</div>
            <div class="text-[10px] opacity-60 truncate font-normal -mt-0.5">
              <span v-if="headerLine">{{ headerLine }}</span>
              <span v-if="trip.startDate && headerLine"> · </span>
              <span v-if="trip.startDate">{{ formatDate(trip.startDate, 'd MMM') }}<span v-if="trip.endDate"> → {{ formatDate(trip.endDate, 'd MMM') }}</span></span>
            </div>
          </div>
        </div>
      </template>
      <template #right>
        <van-tag v-if="role === 'viewer'" type="default" plain size="mini" style="margin-right: 8px;">Lecture</van-tag>
        <van-popover
          v-model:show="showMenu"
          placement="bottom-end"
          :actions="menuActions"
          @select="onMenuSelect"
          teleport="body"
        >
          <template #reference>
            <van-icon name="ellipsis" size="22" />
          </template>
        </van-popover>
      </template>
    </van-nav-bar>

    <div @touchstart.passive="onTabSwipeStart" @touchend.passive="onTabSwipeEnd" @touchcancel.passive="onTabSwipeEnd">
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
      safe-area-inset-bottom
      placeholder
    >
      <van-tabbar-item v-for="t in TABS" :key="t.key" :name="t.key" :icon="t.vanIcon">
        {{ t.label }}
      </van-tabbar-item>
    </van-tabbar>

    <van-floating-bubble
      v-if="canEdit && currentTab.key !== 'map'"
      icon="plus"
      axis="lock"
      magnetic="x"
      @click="openAdd"
    />

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
