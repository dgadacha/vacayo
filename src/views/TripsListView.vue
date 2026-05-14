<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTripsStore } from '@/stores/trips'
import { useAuthStore } from '@/stores/auth'
import { formatDate, colorFromString } from '@/utils/helpers'
import ImportDialog from '@/components/ImportDialog.vue'
import TripFormSheet from '@/components/TripFormSheet.vue'
import Skeleton from '@/components/Skeleton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const router = useRouter()
const trips = useTripsStore()
const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()

const showCreate = ref(false)
const showImport = ref(false)
const refreshing = ref(false)

const sortedTrips = computed(() => trips.sortedTrips)
const loading = computed(() => trips.loading)

function tripGradient(t) { return colorFromString(t.name || t.id) }
function roleOf(t) { return trips.roleOf(t) }

function open(t) { router.push({ name: 'trip', params: { id: t.id } }) }

function onCreated(t) {
  toast.success(`Voyage "${t.name}" créé`)
  router.push({ name: 'trip', params: { id: t.id } })
}

async function confirmDelete(t) {
  if (!trips.isOwner(t)) { toast.error('Seul le propriétaire peut supprimer'); return }
  const ok = await confirm({
    title: `Supprimer "${t.name}" ?`,
    message: 'Les activités liées resteront en base.',
    confirmLabel: 'Supprimer',
    destructive: true
  })
  if (!ok) return
  try {
    await trips.deleteTrip(t.id)
    toast.success('Voyage supprimé')
  } catch (e) {
    toast.error(e.message || 'Erreur')
  }
}

async function logout() {
  await auth.logout()
  router.replace({ name: 'login' })
}

function onImported(res) {
  toast.success(`${res.count} items importés`)
  router.push({ name: 'trip', params: { id: res.tripId } })
}

async function onRefresh() {
  await new Promise(r => setTimeout(r, 600))
  refreshing.value = false
}
</script>

<template>
  <main class="min-h-screen pb-24">
    <van-nav-bar title="Mes voyages" fixed placeholder safe-area-inset-top>
      <template #right>
        <ThemeToggle />
        <van-icon name="upgrade" size="20" @click="showImport = true" style="margin-left: 12px;" />
        <van-icon name="revoke" size="20" @click="logout" style="margin-left: 12px;" />
      </template>
    </van-nav-bar>

    <van-pull-refresh v-model="refreshing" @refresh="onRefresh" success-text="À jour">
      <div class="min-h-[60vh]">
        <Skeleton v-if="loading && sortedTrips.length === 0" variant="trip" :count="3" />

        <van-empty v-else-if="sortedTrips.length === 0" image="search" description="Pas encore de voyage">
          <template #default>
            <div class="flex gap-2 justify-center mt-3">
              <van-button size="small" plain round icon="down" @click="showImport = true">Importer</van-button>
              <van-button size="small" type="primary" round icon="plus" @click="showCreate = true">Créer</van-button>
            </div>
          </template>
        </van-empty>

        <van-cell-group v-else inset style="margin-top: 12px;">
          <van-cell
            v-for="t in sortedTrips"
            :key="t.id"
            is-link
            center
            @click="open(t)"
          >
            <template #icon>
              <div class="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 relative mr-3">
                <img v-if="t.coverImage" :src="t.coverImage" :alt="t.name" class="absolute inset-0 w-full h-full object-cover" loading="lazy" @error="$event.target.style.display='none'" />
                <div v-else class="absolute inset-0 flex items-center justify-center bg-gradient-to-br text-white" :class="tripGradient(t)">
                  <van-icon name="aim" size="22" />
                </div>
              </div>
            </template>
            <template #title>
              <span class="font-semibold">{{ t.name }}</span>
              <van-tag v-if="roleOf(t) === 'owner'" type="warning" size="mini" plain style="margin-left: 6px;">Owner</van-tag>
              <van-tag v-else-if="roleOf(t) === 'editor'" type="primary" size="mini" plain style="margin-left: 6px;">Editor</van-tag>
            </template>
            <template #label>
              <div class="space-y-1">
                <div v-if="t.destination">{{ t.destination }}<span v-if="t.country">, {{ t.country }}</span></div>
                <div v-if="t.startDate" class="text-xs">
                  {{ formatDate(t.startDate, 'd MMM') }}<span v-if="t.endDate"> → {{ formatDate(t.endDate, 'd MMM yyyy') }}</span>
                  <span v-if="t.currencySymbol" class="ml-2 opacity-60">· {{ t.currencySymbol }} {{ t.currency }}</span>
                </div>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </van-pull-refresh>

    <van-floating-bubble
      v-if="sortedTrips.length > 0"
      icon="plus"
      axis="lock"
      magnetic="x"
      @click="showCreate = true"
    />

    <ImportDialog v-model="showImport" @imported="onImported" />
    <TripFormSheet v-model="showCreate" @saved="onCreated" />
  </main>
</template>
