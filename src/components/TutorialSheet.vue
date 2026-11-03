<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { Luggage, Plus, Sparkles, Hand, CalendarDays, MessageCircle, Smartphone, CircleCheck, Trash2, Bookmark, Share } from 'lucide-vue-next'

// First-use tutorial, shown while users/{uid}.tutorialDone is false (or replayed
// from the account sheet). Swipeable pages, Apple onboarding style.
const auth = useAuthStore()
const track = ref(null)
const page = ref(0)

const PAGES = [
  { key: 'welcome', icon: Luggage, bg: 'from-[#5ac8fa] to-[#007aff]', title: 'Bienvenue dans Vacayo', text: 'Ton carnet de voyage à partager : hôtels, restos, activités, planning et carte, tout au même endroit.' },
  { key: 'create', icon: Plus, bg: 'from-[#5ee07c] to-[#34c759]', title: 'Crée un voyage', text: 'Touche + en haut à droite, puis indique la destination et tes dates d’arrivée et de départ.' },
  { key: 'ai', icon: Sparkles, bg: 'ai', title: 'L’IA prépare tout', text: 'Laisse « Préparer avec l’IA » activé : étapes, hôtels et programme jour par jour te sont proposés. Tu décoches ce qui ne te plaît pas.' },
  { key: 'swipe', icon: Hand, bg: 'from-[#ffb340] to-[#ff9500]', title: 'Un geste pour tout', text: 'Balaie une ligne vers la gauche pour « Fait » ou « Supprimer », vers la droite pour « Réservé ». Un appui long ouvre toutes les options.' },
  { key: 'plan', icon: CalendarDays, bg: 'from-[#ff6961] to-[#ff3b30]', title: 'Jour par jour', text: 'L’onglet Planning montre chaque journée heure par heure, l’onglet Carte situe tous tes lieux.' },
  { key: 'copilot', icon: MessageCircle, bg: 'ai', title: 'Pose tes questions', text: 'Le bouton ✨ ouvre le copilote, qui connaît tout ton voyage.' },
  { key: 'iphone', icon: Smartphone, bg: 'from-[#8e8e93] to-[#636366]', title: 'Sur ton iPhone', text: 'Dans Safari, touche Partager puis « Sur l’écran d’accueil » : Vacayo s’ouvre alors comme une vraie app.' }
]
const isLast = computed(() => page.value === PAGES.length - 1)

watch(() => auth.showTutorial, (v) => { if (v) { page.value = 0; track.value?.scrollTo({ left: 0 }) } })

function onScroll() {
  const el = track.value
  if (el) page.value = Math.round(el.scrollLeft / el.clientWidth)
}
function goTo(i) {
  track.value?.scrollTo({ left: i * track.value.clientWidth, behavior: 'smooth' })
}
function next() {
  if (isLast.value) auth.completeTutorial()
  else goTo(page.value + 1)
}
</script>

<template>
  <Transition name="tuto">
    <div v-if="auth.showTutorial" class="fixed inset-0 z-[3000] flex flex-col" style="background: var(--vc-bg)" role="dialog" aria-modal="true" aria-label="Découvrir Vacayo">
      <header class="flex justify-end px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] h-[calc(env(safe-area-inset-top)+44px)]">
        <button v-if="!isLast" type="button" class="t-body text-tint active:opacity-40" @click="auth.completeTutorial()">Passer</button>
      </header>

      <div ref="track" class="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" @scroll.passive="onScroll">
        <section v-for="p in PAGES" :key="p.key" class="w-full flex-shrink-0 snap-center flex flex-col items-center justify-center px-9 text-center">
          <div
            class="w-[112px] h-[112px] rounded-[26px] flex items-center justify-center text-white shadow-lift"
            :class="p.bg === 'ai' ? '' : 'bg-gradient-to-b ' + p.bg"
            :style="p.bg === 'ai' ? { background: 'var(--vc-ai)' } : {}"
          >
            <component :is="p.icon" class="w-14 h-14" :stroke-width="1.6" />
          </div>
          <h2 class="t-title1 mt-8 [text-wrap:balance]">{{ p.title }}</h2>
          <p class="t-body text-muted mt-3 max-w-sm [text-wrap:pretty]">{{ p.text }}</p>

          <!-- Small live demos for the gestures and the copilot -->
          <div v-if="p.key === 'swipe'" class="mt-7 w-full max-w-sm list !mx-0 flex text-left">
            <div class="flex items-center justify-center w-[72px] bg-[#007aff] text-white t-caption font-medium flex-col gap-1"><Bookmark class="w-4 h-4" :stroke-width="2.2" />Réservé</div>
            <div class="flex-1 min-w-0 px-3 py-2.5">
              <p class="t-body font-medium truncate">Senso-ji</p>
              <p class="t-subhead text-muted truncate">Temple · Tokyo</p>
            </div>
            <div class="flex items-center justify-center w-[64px] bg-[#34c759] text-white t-caption font-medium flex-col gap-1"><CircleCheck class="w-4 h-4" :stroke-width="2.2" />Fait</div>
            <div class="flex items-center justify-center w-[64px] bg-[#ff3b30] text-white t-caption font-medium flex-col gap-1"><Trash2 class="w-4 h-4" :stroke-width="2.2" />Suppr.</div>
          </div>
          <div v-else-if="p.key === 'copilot'" class="mt-7 w-full max-w-sm space-y-1.5 text-left">
            <p class="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-md px-3 py-1.5 text-white" style="background: var(--vc-primary)">Qu’est-ce qu’il me reste à réserver ?</p>
            <p class="w-fit max-w-[85%] rounded-[18px] rounded-bl-md px-3 py-1.5" style="background: var(--vc-bubble)">Le ryokan à Kyoto et le créneau coucher de soleil à Shibuya Sky.</p>
          </div>
          <div v-else-if="p.key === 'iphone'" class="mt-7 inline-flex items-center gap-2 t-subhead text-muted">
            <Share class="w-5 h-5 text-tint" :stroke-width="2" /> Partager → Sur l’écran d’accueil
          </div>
        </section>
      </div>

      <footer class="px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4">
        <div class="flex justify-center gap-2 mb-6" role="tablist" aria-label="Pages du tutoriel">
          <button
            v-for="(p, i) in PAGES"
            :key="p.key"
            type="button"
            class="w-2 h-2 rounded-full transition"
            :style="{ background: i === page ? 'var(--vc-text)' : 'var(--vc-subtle)' }"
            :aria-label="`Page ${i + 1}`"
            :aria-selected="i === page"
            @click="goTo(i)"
          />
        </div>
        <button type="button" class="btn btn-primary w-full max-w-md mx-auto flex" @click="next">{{ isLast ? 'C’est parti' : 'Continuer' }}</button>
      </footer>
    </div>
  </Transition>
</template>

<style scoped>
.tuto-enter-active, .tuto-leave-active { transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
.tuto-enter-from, .tuto-leave-to { opacity: 0; transform: translateY(24px); }
</style>
