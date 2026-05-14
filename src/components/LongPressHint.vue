<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useActivitiesStore } from '@/stores/activities'
import { Hand, X } from 'lucide-vue-next'

const HINT_KEY = 'vacayo:hint:longpress:v1'
const activities = useActivitiesStore()

const props = defineProps({ active: Boolean })

const dismissed = ref(localStorage.getItem(HINT_KEY) === '1')
const visible = ref(false)
let showTimer = null
let autoHideTimer = null

const shouldShow = computed(() => !dismissed.value && props.active && activities.all.length > 0)

function dismiss() {
  if (dismissed.value) return
  dismissed.value = true
  localStorage.setItem(HINT_KEY, '1')
  visible.value = false
}

function onLongPress() { dismiss() }

onMounted(() => {
  window.addEventListener('vacayo:long-press', onLongPress)
  // Reveal after a tiny delay so it doesn't flash on mount
  showTimer = setTimeout(() => {
    if (shouldShow.value) visible.value = true
  }, 800)
  // Auto-dismiss after 10s
  autoHideTimer = setTimeout(() => {
    if (visible.value) dismiss()
  }, 12000)
})

onBeforeUnmount(() => {
  window.removeEventListener('vacayo:long-press', onLongPress)
  if (showTimer) clearTimeout(showTimer)
  if (autoHideTimer) clearTimeout(autoHideTimer)
})
</script>

<template>
  <Transition name="hint">
    <div
      v-if="visible && shouldShow"
      class="fixed left-1/2 -translate-x-1/2 z-30 px-3 pointer-events-none"
      style="bottom: calc(env(safe-area-inset-bottom) + 4.5rem);"
    >
      <div class="pointer-events-auto card !rounded-full px-3 py-2 flex items-center gap-2 shadow-lg ring-slate-200 dark:ring-slate-700 max-w-[20rem]">
        <Hand class="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" :stroke-width="2" />
        <span class="text-[12px] leading-tight">Appuie <strong>long</strong> sur une carte pour plus d'actions</span>
        <button @click="dismiss" class="btn-icon !w-6 !h-6 -mr-1 flex-shrink-0" aria-label="Compris">
          <X class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.hint-enter-active, .hint-leave-active { transition: all 0.25s cubic-bezier(.2,.8,.2,1); }
.hint-enter-from, .hint-leave-to { opacity: 0; transform: translate(-50%, 10px); }
.hint-enter-to, .hint-leave-from { opacity: 1; transform: translate(-50%, 0); }
</style>
