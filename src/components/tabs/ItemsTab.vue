<script setup>
import { computed, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import ActivityCard from '@/components/ActivityCard.vue'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { Sparkles, ClipboardPaste, Search, Wand2 } from 'lucide-vue-next'

const props = defineProps({
  type: { type: String, required: true },
  onEdit: Function,
  onView: Function,
  onAdd: Function
})

const activities = useActivitiesStore()
const canEdit = inject('canEdit')
const aiActions = inject('aiActions', null)
const meta = computed(() => ACTIVITY_TYPES[props.type])

const list = computed(() => ({
  hotel: activities.filteredHotels,
  restaurant: activities.filteredRestaurants,
  activity: activities.filteredActivities
}[props.type] || []))
const totalOfType = computed(() => activities.all.filter(a => a.type === props.type).length)
const filters = computed(() => activities.filtersFor(props.type))
const isFiltered = computed(() => !!(filters.value.search || filters.value.city))

// With a date sort, split what is scheduled from the wishlist
const groups = computed(() => {
  if (props.type === 'hotel' || !filters.value.sort.startsWith('date')) return [{ key: 'all', title: '', items: list.value }]
  const planned = list.value.filter(a => a.date)
  const wish = list.value.filter(a => !a.date)
  return [
    { key: 'planned', title: planned.length && wish.length ? 'Planifiés' : '', items: planned },
    { key: 'wish', title: wish.length ? 'Sans date' : '', items: wish }
  ].filter(g => g.items.length)
})

const EMPTY_TITLE = {
  hotel: 'Aucun hôtel',
  restaurant: 'Aucun restaurant',
  activity: 'Aucune activité'
}
const EMPTY_TEXT = {
  hotel: 'Ajoute tes hébergements : ils structurent ton planning, nuit par nuit.',
  restaurant: 'Garde ici les adresses à tester sur place.',
  activity: 'Musées, balades, expériences, shopping… tout ce que tu veux voir.'
}
</script>

<template>
  <div class="pt-5 pb-4">
    <div v-if="activities.loading && activities.all.length === 0" class="px-4">
      <div class="shimmer h-72 !rounded-xl" />
    </div>

    <!-- No result for the current filters -->
    <div v-else-if="list.length === 0 && isFiltered" class="text-center pt-14 px-8">
      <Search class="w-12 h-12 mx-auto text-subtle" :stroke-width="1.6" />
      <p class="t-title3 mt-3">Aucun résultat</p>
      <p class="t-subhead text-muted mt-1">Essaie une autre recherche ou une autre ville.</p>
      <button type="button" class="btn btn-plain mt-2" @click="activities.resetFilters(type)">Effacer les filtres</button>
    </div>

    <!-- Nothing of this type yet -->
    <div v-else-if="totalOfType === 0" class="text-center pt-10 px-8">
      <div class="inline-flex w-[72px] h-[72px] rounded-[18px] items-center justify-center text-white bg-gradient-to-b" :class="meta.gradient">
        <component :is="meta.icon" class="w-9 h-9" :stroke-width="1.7" />
      </div>
      <p class="t-title2 mt-5">{{ EMPTY_TITLE[type] }}</p>
      <p class="t-subhead text-muted mt-1.5">{{ EMPTY_TEXT[type] }}</p>
      <div v-if="canEdit" class="mt-6 max-w-xs mx-auto">
        <button type="button" class="btn btn-primary w-full" @click="onAdd && onAdd()">Ajouter</button>
        <div v-if="aiActions" class="list !mx-0 mt-4 text-left" style="--sep-inset: 57px">
          <button v-if="activities.all.length === 0" type="button" class="row" @click="aiActions.openGenerator()">
            <span class="row-icon" style="background: var(--vc-ai)"><Wand2 class="w-[17px] h-[17px]" :stroke-width="2" /></span>
            <span class="t-body flex-1">Générer tout le voyage</span>
          </button>
          <button type="button" class="row" @click="aiActions.openSuggest()">
            <span class="row-icon" style="background: var(--vc-ai)"><Sparkles class="w-[17px] h-[17px]" :stroke-width="2" /></span>
            <span class="t-body flex-1">Idées de l’IA</span>
          </button>
          <button type="button" class="row" @click="aiActions.openImport()">
            <span class="row-icon" style="background: var(--vc-ai)"><ClipboardPaste class="w-[17px] h-[17px]" :stroke-width="2" /></span>
            <span class="t-body flex-1">Coller un mail ou une liste</span>
          </button>
        </div>
      </div>
    </div>

    <template v-else>
      <section v-for="g in groups" :key="g.key" class="mb-7 last:mb-0">
        <h3 v-if="g.title" class="list-header">{{ g.title }} · {{ g.items.length }}</h3>
        <TransitionGroup tag="div" name="list" class="list" style="--sep-inset: 80px">
          <ActivityCard
            v-for="a in g.items"
            :key="a.id"
            :activity="a"
            @edit="onEdit && onEdit($event)"
            @view="onView && onView($event)"
          />
        </TransitionGroup>
      </section>
    </template>
  </div>
</template>

<style scoped>
.list-enter-active, .list-leave-active { transition: all 0.25s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(-12px); }
</style>
