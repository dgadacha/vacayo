<script setup>
import { computed, inject } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import ActivityCard from '@/components/ActivityCard.vue'
import { ACTIVITY_TYPES } from '@/utils/constants'
import { Plus, Sparkles, ClipboardPaste, SearchX } from 'lucide-vue-next'

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
    { key: 'planned', title: planned.length && wish.length ? `Planifiés · ${planned.length}` : '', items: planned },
    { key: 'wish', title: wish.length ? `Sans date · ${wish.length}` : '', items: wish }
  ].filter(g => g.items.length)
})

const EMPTY_TITLE = {
  hotel: 'Aucun hôtel pour l’instant',
  restaurant: 'Aucun restaurant pour l’instant',
  activity: 'Aucune activité pour l’instant'
}
const EMPTY_TEXT = {
  hotel: 'Ajoute tes hébergements : ils structurent ton planning, nuit par nuit.',
  restaurant: 'Garde ici les adresses à tester sur place.',
  activity: 'Musées, balades, expériences, shopping… tout ce que tu veux voir.'
}
</script>

<template>
  <div class="px-4 pt-3 pb-4">
    <div v-if="activities.loading && activities.all.length === 0" class="space-y-2.5">
      <div v-for="i in 4" :key="i" class="shimmer h-[98px] !rounded-2xl" />
    </div>

    <!-- No result for the current filters -->
    <div v-else-if="list.length === 0 && isFiltered" class="text-center py-14 px-6">
      <SearchX class="w-10 h-10 mx-auto text-subtle" :stroke-width="1.5" />
      <p class="mt-3 font-semibold">Aucun résultat</p>
      <p class="text-sm text-muted mt-1">Essaie une autre recherche ou une autre ville.</p>
      <button type="button" class="btn btn-secondary mt-4 !h-9 !text-xs" @click="activities.resetFilters(type)">Effacer les filtres</button>
    </div>

    <!-- Nothing of this type yet -->
    <div v-else-if="totalOfType === 0" class="text-center py-12 px-6">
      <div class="inline-flex w-16 h-16 rounded-2xl items-center justify-center" :class="meta.soft">
        <component :is="meta.icon" class="w-8 h-8" :stroke-width="1.5" />
      </div>
      <p class="mt-4 font-semibold text-lg">{{ EMPTY_TITLE[type] }}</p>
      <p class="text-sm text-muted mt-1 max-w-xs mx-auto">{{ EMPTY_TEXT[type] }}</p>
      <div v-if="canEdit" class="mt-5 flex flex-col gap-2 max-w-xs mx-auto">
        <button type="button" class="btn btn-primary" @click="onAdd && onAdd()"><Plus class="w-4 h-4" :stroke-width="2.5" />Ajouter</button>
        <div v-if="aiActions" class="flex gap-2">
          <button type="button" class="btn btn-secondary flex-1 !text-xs" @click="aiActions.openSuggest()"><Sparkles class="w-4 h-4 text-violet-500" :stroke-width="2" />Idées IA</button>
          <button type="button" class="btn btn-secondary flex-1 !text-xs" @click="aiActions.openImport()"><ClipboardPaste class="w-4 h-4 text-violet-500" :stroke-width="2" />Coller un texte</button>
        </div>
      </div>
    </div>

    <template v-else>
      <section v-for="g in groups" :key="g.key" class="mb-4 last:mb-0">
        <h3 v-if="g.title" class="section-label px-1 mb-2">{{ g.title }}</h3>
        <TransitionGroup tag="div" name="list" class="space-y-2.5">
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
.list-enter-from, .list-leave-to { opacity: 0; transform: translateY(6px); }
</style>
