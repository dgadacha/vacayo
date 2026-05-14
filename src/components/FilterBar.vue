<script setup>
import { computed } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { SORT_OPTIONS } from '@/utils/constants'
import { Search, X, ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, required: true } // 'hotel' | 'restaurant' | 'activity'
})

const activities = useActivitiesStore()
const filters = computed(() => activities.filtersFor(props.type))
const cities = computed(() => activities.citiesFor(props.type))

function clearSearch() { filters.value.search = '' }
</script>

<template>
  <div class="px-4 mt-3 space-y-2">
    <div class="relative">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
      <input
        v-model="filters.search"
        class="input pl-10 pr-10"
        placeholder="Rechercher un lieu, une catégorie…"
      />
      <button v-if="filters.search" @click="clearSearch" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Effacer">
        <X class="w-4 h-4" :stroke-width="2" />
      </button>
    </div>
    <div class="flex gap-2">
      <div class="relative flex-1">
        <select v-model="filters.city" class="input !py-2 !pr-8 text-sm appearance-none">
          <option value="">Toutes les villes</option>
          <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
        </select>
        <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" :stroke-width="2" />
      </div>
      <div class="relative flex-1">
        <select v-model="filters.sort" class="input !py-2 !pr-8 text-sm appearance-none">
          <option v-for="o in SORT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <ChevronDown class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" :stroke-width="2" />
      </div>
    </div>
  </div>
</template>
