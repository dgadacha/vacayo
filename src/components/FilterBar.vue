<script setup>
import { computed, ref } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { SORT_OPTIONS } from '@/utils/constants'
import { Search, CircleX, ArrowUpDown } from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, required: true }
})

const activities = useActivitiesStore()
const filters = computed(() => activities.filtersFor(props.type))
const cities = computed(() => activities.citiesFor(props.type))
const showSort = ref(false)

const sortActions = computed(() => SORT_OPTIONS.map(o => ({
  name: o.value === filters.value.sort ? `✓ ${o.label}` : o.label,
  value: o.value
})))
const sortLabel = computed(() => SORT_OPTIONS.find(o => o.value === filters.value.sort)?.label || 'Trier')

function pickCity(c) { filters.value.city = filters.value.city === c ? '' : c }
function onSort(a) { filters.value.sort = a.value; showSort.value = false }
</script>

<template>
  <div class="px-4 space-y-2.5">
    <div class="flex gap-2 items-center">
      <label class="search-field flex-1 min-w-0">
        <Search class="w-[18px] h-[18px] flex-shrink-0" :stroke-width="2.2" />
        <input v-model="filters.search" type="search" enterkeyhint="search" placeholder="Rechercher" aria-label="Rechercher" />
        <button v-if="filters.search" type="button" aria-label="Effacer la recherche" @click="filters.search = ''">
          <CircleX class="w-[18px] h-[18px]" fill="currentColor" stroke="var(--vc-bg)" :stroke-width="2" />
        </button>
      </label>
      <button type="button" class="bar-btn !w-9 !h-9" :aria-label="`Trier : ${sortLabel}`" @click="showSort = true">
        <ArrowUpDown class="w-[18px] h-[18px]" :stroke-width="2.2" />
      </button>
    </div>

    <div v-if="cities.length > 1" data-no-swipe class="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
      <button type="button" class="pill" :aria-pressed="!filters.city" @click="filters.city = ''">Toutes</button>
      <button v-for="c in cities" :key="c" type="button" class="pill" :aria-pressed="filters.city === c" @click="pickCity(c)">{{ c }}</button>
    </div>

    <van-action-sheet v-model:show="showSort" title="Trier par" :actions="sortActions" cancel-text="Annuler" teleport="body" @select="onSort" />
  </div>
</template>

<style scoped>
.pill {
  @apply rounded-full whitespace-nowrap flex-shrink-0 transition;
  height: 32px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 500;
  background: var(--vc-surface);
  color: var(--vc-text);
}
.pill:active { opacity: 0.6; }
.pill[aria-pressed='true'] { background: var(--vc-primary); color: #fff; }
input[type='search']::-webkit-search-cancel-button { display: none; }
</style>
