<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, inject, nextTick } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { useThemeStore } from '@/stores/theme'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { geocodeMany, geocodeCity } from '@/services/geocode'
import { Map as MapIcon, Loader2, MapPin, X } from 'lucide-vue-next'

const props = defineProps({ onEdit: Function, onView: Function })

const activities = useActivitiesStore()
const theme = useThemeStore()
const trip = inject('trip', ref(null))

const mapEl = ref(null)
let mapInstance = null
let markers = []
let LeafletLib = null
let tileLayer = null

const geocoding = ref(false)
const progress = ref({ current: 0, total: 0 })
const coords = ref({}) // city -> {lat, lng}
const unlocatedItems = ref([])
const showUnlocated = ref(false)

const tilesLight = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const tilesDark = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

// Group items by city
const grouped = computed(() => {
  const byCity = new Map()
  activities.all.forEach(a => {
    const c = (a.city || '').trim()
    if (!c) {
      unlocatedItems.value.push(a)
      return
    }
    if (!byCity.has(c)) byCity.set(c, [])
    byCity.get(c).push(a)
  })
  return [...byCity.entries()].map(([city, items]) => ({ city, items }))
})

async function loadLeaflet() {
  if (LeafletLib) return LeafletLib
  const mod = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  LeafletLib = mod.default || mod
  return LeafletLib
}

function typeColor(type) {
  return {
    hotel: '#0284c7',
    restaurant: '#d97706',
    activity: '#7c3aed'
  }[type] || '#475569'
}

function clusterIcon(L, items) {
  const types = [...new Set(items.map(i => i.type))]
  const primary = types.includes('hotel') ? 'hotel' : types[0]
  const color = typeColor(primary)
  const count = items.length
  return L.divIcon({
    className: 'vacayo-marker',
    html: `<div style="background:${color};">
      <span>${count}</span>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })
}

let userInteracted = false
let activeAbort = null

function addCityMarker(L, city, items, loc) {
  if (!loc || loc.lat == null) {
    unlocatedItems.value.push(...items)
    return null
  }
  const marker = L.marker([loc.lat, loc.lng], { icon: clusterIcon(L, items) })
  marker.bindPopup(buildPopup(city, items), { maxWidth: 280, className: 'vacayo-popup' })
  marker.on('popupopen', wireUpPopupClicks)
  marker.addTo(mapInstance)
  markers.push(marker)
  return [loc.lat, loc.lng]
}

async function renderMap() {
  if (!mapEl.value) return
  const L = await loadLeaflet()

  if (!mapInstance) {
    mapInstance = L.map(mapEl.value, { zoomControl: true, attributionControl: true, preferCanvas: true })
    tileLayer = L.tileLayer(theme.mode === 'dark' ? tilesDark : tilesLight, {
      attribution: '© OpenStreetMap contributors, © CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(mapInstance)
    mapInstance.setView([35.6762, 139.6503], 4) // default Tokyo
    mapInstance.on('dragstart zoomstart', () => { userInteracted = true })
  }

  // Cancel any in-flight geocoding from a previous render
  activeAbort?.abort()
  activeAbort = new AbortController()
  const { signal } = activeAbort

  // Reset state
  markers.forEach(m => mapInstance.removeLayer(m))
  markers = []
  unlocatedItems.value = []
  userInteracted = false

  const cityList = grouped.value
  if (cityList.length === 0) return

  geocoding.value = true
  progress.value = { current: 0, total: cityList.length }

  const cityToItems = new Map(cityList.map(g => [g.city, g.items]))
  const liveBounds = []

  // Initial fit: bound the world view roughly while we wait
  await geocodeMany(
    cityList.map(g => g.city),
    (done, total, city, loc) => {
      progress.value = { current: done, total }
      if (signal.aborted) return
      const items = cityToItems.get(city) || []
      const coord = addCityMarker(L, city, items, loc)
      if (coord) liveBounds.push(coord)
      // Periodically refit bounds to keep visible context
      if (!userInteracted && liveBounds.length > 0 && (done === total || done % 5 === 0)) {
        if (liveBounds.length === 1) mapInstance.setView(liveBounds[0], 11)
        else mapInstance.fitBounds(liveBounds, { padding: [40, 40], animate: false })
      }
    },
    { concurrency: 6, signal }
  )

  geocoding.value = false
}

function buildPopup(city, items) {
  const rows = items.slice(0, 8).map(i => {
    const meta = ACTIVITY_TYPES[i.type] || ACTIVITY_TYPES.activity
    return `<button class="vacayo-popup-item" data-id="${i.id}">
      <span class="vacayo-popup-dot" style="background:${typeColor(i.type)};"></span>
      <span class="vacayo-popup-name">${escapeHtml(i.name)}</span>
    </button>`
  }).join('')
  const more = items.length > 8 ? `<p class="vacayo-popup-more">+ ${items.length - 8} autres</p>` : ''
  return `<div class="vacayo-popup-inner">
    <p class="vacayo-popup-city">${escapeHtml(city)}</p>
    <p class="vacayo-popup-count">${items.length} item${items.length > 1 ? 's' : ''}</p>
    <div class="vacayo-popup-list">${rows}</div>
    ${more}
  </div>`
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function wireUpPopupClicks() {
  document.querySelectorAll('.vacayo-popup-item').forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-id')
      const item = activities.all.find(a => a.id === id)
      if (!item) return
      try { mapInstance?.closePopup() } catch {}
      props.onView?.(item)
    }
  })
}

onMounted(async () => {
  await nextTick()
  await renderMap()
})

watch(() => activities.all.length, () => { renderMap() })

watch(() => theme.mode, async () => {
  if (!mapInstance || !LeafletLib) return
  const L = LeafletLib
  if (tileLayer) mapInstance.removeLayer(tileLayer)
  tileLayer = L.tileLayer(theme.mode === 'dark' ? tilesDark : tilesLight, {
    attribution: '© OpenStreetMap contributors, © CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(mapInstance)
})

onBeforeUnmount(() => {
  activeAbort?.abort()
  markers.forEach(m => mapInstance?.removeLayer(m))
  markers = []
  mapInstance?.remove()
  mapInstance = null
})

function clickUnlocated(item) { showUnlocated.value = false; props.onView?.(item) }
</script>

<template>
  <div class="relative w-full" :style="{ height: 'calc(100dvh - 8.5rem)' }">
    <div ref="mapEl" class="absolute inset-0" />

    <div v-if="geocoding" class="absolute top-3 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-xs z-[5]">
      <div class="card px-3 py-2 flex items-center gap-2.5 shadow-lg">
        <Loader2 class="w-4 h-4 animate-spin text-slate-500" :stroke-width="2" />
        <p class="text-xs flex-1">Géocodage… {{ progress.current }}/{{ progress.total }}</p>
      </div>
    </div>

    <div v-if="!geocoding && grouped.length === 0" class="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
      <div class="text-center px-6 pointer-events-auto">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
          <MapPin class="w-7 h-7" :stroke-width="1.5" />
        </div>
        <h3 class="font-semibold">Pas encore de lieux</h3>
        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Ajoute des activités avec une ville pour les voir sur la carte.</p>
      </div>
    </div>

    <!-- Floating unlocated chip -->
    <button
      v-if="unlocatedItems.length > 0"
      @click="showUnlocated = !showUnlocated"
      class="absolute bottom-3 left-3 z-[10] chip bg-white/95 dark:bg-slate-900/95 backdrop-blur ring-slate-200 dark:ring-slate-700 text-slate-700 dark:text-slate-200 shadow-lg !text-xs !px-2.5 !py-1.5"
    >
      <MapPin class="w-3 h-3" :stroke-width="2" />
      {{ unlocatedItems.length }} sans lieu
    </button>

    <!-- Unlocated panel -->
    <Transition name="fade">
      <div v-if="showUnlocated && unlocatedItems.length > 0" class="absolute bottom-14 left-3 right-3 sm:right-auto sm:max-w-sm z-[10]">
        <div class="card p-3 shadow-lg max-h-64 overflow-y-auto">
          <div class="flex items-center justify-between mb-2">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sans ville géolocalisable
            </p>
            <button @click="showUnlocated = false" class="btn-icon !w-6 !h-6">
              <X class="w-3.5 h-3.5" :stroke-width="2" />
            </button>
          </div>
          <div class="space-y-0.5">
            <button v-for="i in unlocatedItems" :key="i.id" @click="clickUnlocated(i)" class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs flex items-center gap-2">
              <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ background: typeColor(i.type) }" />
              <span class="truncate flex-1">{{ i.name }}</span>
              <span class="text-slate-400 truncate text-[10px]">{{ i.city || '—' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
/* Force the Leaflet map's stacking context to stay below page overlays */
.leaflet-container { z-index: 0; }
.leaflet-pane, .leaflet-top, .leaflet-bottom { z-index: 1 !important; }
.leaflet-popup-pane { z-index: 7 !important; }
.leaflet-tooltip-pane { z-index: 6 !important; }
.leaflet-control { z-index: 8 !important; }

.vacayo-marker {
  background: transparent !important;
  border: 0 !important;
}
.vacayo-marker > div {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 0 0 3px rgba(255,255,255,0.95);
  font-family: Inter, system-ui, sans-serif;
}
.dark .vacayo-marker > div {
  box-shadow: 0 4px 12px rgba(0,0,0,0.6), 0 0 0 3px rgba(15,23,42,0.95);
}
.vacayo-popup .leaflet-popup-content-wrapper {
  border-radius: 16px;
  padding: 0;
  background: white;
  box-shadow: 0 12px 40px rgba(0,0,0,0.18);
}
.dark .vacayo-popup .leaflet-popup-content-wrapper {
  background: #0f172a;
  color: #e2e8f0;
}
.vacayo-popup .leaflet-popup-tip {
  background: white;
}
.dark .vacayo-popup .leaflet-popup-tip { background: #0f172a; }
.vacayo-popup .leaflet-popup-content { margin: 0; padding: 12px 14px; min-width: 220px; font-family: Inter, system-ui, sans-serif; }
.vacayo-popup-city { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
.vacayo-popup-count { font-size: 11px; color: #64748b; margin: 2px 0 8px; }
.dark .vacayo-popup-count { color: #94a3b8; }
.vacayo-popup-list { display: flex; flex-direction: column; gap: 2px; }
.vacayo-popup-item {
  background: transparent; border: 0; padding: 6px 4px; border-radius: 6px;
  display: flex; align-items: center; gap: 8px; cursor: pointer;
  font-size: 12px; text-align: left; color: inherit; width: 100%;
}
.vacayo-popup-item:hover { background: #f1f5f9; }
.dark .vacayo-popup-item:hover { background: #1e293b; }
.vacayo-popup-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.vacayo-popup-name { font-weight: 500; }
.vacayo-popup-more { font-size: 11px; color: #94a3b8; margin: 6px 4px 0; }
.leaflet-control-attribution {
  font-size: 9px !important;
  background: rgba(255,255,255,0.75) !important;
}
.dark .leaflet-control-attribution {
  background: rgba(15,23,42,0.75) !important;
  color: #94a3b8 !important;
}
.dark .leaflet-control-attribution a { color: #cbd5e1 !important; }
.leaflet-touch .leaflet-bar a {
  background-color: white;
  color: #0f172a;
}
.dark .leaflet-touch .leaflet-bar a {
  background-color: #1e293b;
  color: #e2e8f0;
  border-bottom-color: #334155;
}
</style>
