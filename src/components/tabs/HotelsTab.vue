<script setup>
import { useActivitiesStore } from '@/stores/activities'
import ActivityCard from '@/components/ActivityCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import Skeleton from '@/components/Skeleton.vue'
import { BedDouble } from 'lucide-vue-next'

defineProps({ onEdit: Function, onView: Function })
const activities = useActivitiesStore()
</script>

<template>
  <div class="px-4 pt-3 pb-4 space-y-2.5">
    <Skeleton v-if="activities.loading && activities.all.length === 0" variant="activity" :count="3" />
    <template v-else>
      <EmptyState v-if="activities.filteredHotels.length === 0" :icon="BedDouble" title="Aucun hôtel" message="Ajoute ton premier hébergement avec le bouton +." />
      <ActivityCard
        v-for="h in activities.filteredHotels"
        :key="h.id"
        :activity="h"
        @edit="onEdit && onEdit($event)"
        @view="onView && onView($event)"
      />
    </template>
  </div>
</template>
