<script setup>
import { computed, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { SORT_OPTIONS } from '@/utils/constants'
import { Search, X, ArrowUpDown } from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, required: true }
})

const activities = useActivitiesStore()
const filters = computed(() => activities.filtersFor(props.type))
const cities = computed(() => activities.citiesFor(props.type))
const showSort = ref(false)

const sortActions = computed(() => SORT_OPTIONS.map(o => ({
  name: o.label,
  value: o.value,
  color: o.value === filters.value.sort ? 'var(--vc-primary)' : undefined
})))
const sortLabel = computed(() => SORT_OPTIONS.find(o => o.value === filters.value.sort)?.label || 'Trier')

function pickCity(c) { filters.value.city = filters.value.city === c ? '' : c }
function onSort(a) { filters.value.sort = a.value; showSort.value = false }
</script>

<template>
  <div class="px-4 space-y-2.5">
    <div class="flex gap-2">
      <label class="flex-1 flex items-center gap-2 h-10 px-3.5 rounded-full surface border border-soft shadow-soft min-w-0">
        <Search class="w-4 h-4 text-subtle flex-shrink-0" :stroke-width="2" />
        <input v-model="filters.search" type="search" placeholder="Rechercher un lieu, une catégorie…" class="flex-1 min-w-0 bg-transparent outline-none text-sm" aria-label="Rechercher" />
        <button v-if="filters.search" type="button" class="text-subtle" aria-label="Effacer la recherche" @click="filters.search = ''">
          <X class="w-4 h-4" :stroke-width="2" />
        </button>
      </label>
      <button type="button" class="h-10 w-10 rounded-full surface border border-soft shadow-soft flex items-center justify-center flex-shrink-0" :aria-label="`Trier : ${sortLabel}`" @click="showSort = true">
        <ArrowUpDown class="w-4 h-4" :stroke-width="2" />
      </button>
    </div>

    <div v-if="cities.length > 1" data-no-swipe class="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
      <button type="button" class="pill" :aria-pressed="!filters.city" @click="filters.city = ''">Toutes</button>
      <button v-for="c in cities" :key="c" type="button" class="pill" :aria-pressed="filters.city === c" @click="pickCity(c)">{{ c }}</button>
    </div>

    <van-action-sheet v-model:show="showSort" title="Trier par" :actions="sortActions" cancel-text="Annuler" teleport="body" @select="onSort" />
  </div>
</template>

<style scoped>
.pill {
  @apply h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition;
  background: var(--vc-surface);
  border: 1px solid var(--vc-border-soft);
  color: var(--vc-muted);
}
.pill[aria-pressed='true'] { background: var(--vc-text); border-color: var(--vc-text); color: var(--vc-bg); }
input[type='search']::-webkit-search-cancel-button { display: none; }
</style>
