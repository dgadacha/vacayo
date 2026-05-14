<script setup>
import { useActivitiesStore } from '@/stores/activities'
import ActivityCard from '@/components/ActivityCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import Skeleton from '@/components/Skeleton.vue'
import { UtensilsCrossed } from 'lucide-vue-next'

defineProps({ onEdit: Function, onView: Function })
const activities = useActivitiesStore()
</script>

<template>
  <div class="px-4 pt-3 pb-4 space-y-2.5">
    <Skeleton v-if="activities.loading && activities.all.length === 0" variant="activity" :count="4" />
    <template v-else>
      <EmptyState v-if="activities.filteredRestaurants.length === 0" :icon="UtensilsCrossed" title="Aucun restaurant" message="Ajoute des adresses à tester sur place." />
      <ActivityCard
        v-for="r in activities.filteredRestaurants"
        :key="r.id"
        :activity="r"
        @edit="onEdit && onEdit($event)"
        @view="onView && onView($event)"
      />
    </template>
  </div>
</template>
