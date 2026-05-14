<script setup>
import { computed } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { SORT_OPTIONS } from '@/utils/constants'

const props = defineProps({
  type: { type: String, required: true }
})

const activities = useActivitiesStore()
const filters = computed(() => activities.filtersFor(props.type))
const cities = computed(() => activities.citiesFor(props.type))

const cityOptions = computed(() => [
  { text: 'Toutes les villes', value: '' },
  ...cities.value.map(c => ({ text: c, value: c }))
])
const sortOptions = computed(() =>
  SORT_OPTIONS.map(o => ({ text: o.label, value: o.value }))
)
</script>

<template>
  <div>
    <van-search
      v-model="filters.search"
      placeholder="Rechercher un lieu, une catégorie…"
      shape="round"
      clearable
    />
    <van-dropdown-menu :overlay="true">
      <van-dropdown-item v-model="filters.city" :options="cityOptions" />
      <van-dropdown-item v-model="filters.sort" :options="sortOptions" />
    </van-dropdown-menu>
  </div>
</template>
