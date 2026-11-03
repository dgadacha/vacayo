<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLogo from '@/components/AppLogo.vue'
import { useToast } from '@/composables/useToast'
import { ChevronLeft, Users, CalendarDays, Sparkles, Eye, EyeOff } from 'lucide-vue-next'

const WELCOMED_KEY = 'vacayo:welcomed'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

function seenWelcome() { try { return localStorage.getItem(WELCOMED_KEY) === '1' } catch { return false } }

// welcome → login | register → reset
const mode = ref(seenWelcome() ? 'login' : 'welcome')
const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const info = ref('')
const loading = ref(false)

const TITLES = { login: 'Connexion', register: 'Créer un compte', reset: 'Mot de passe oublié' }
const CTA = { login: 'Se connecter', register: 'Créer le compte', reset: 'Envoyer le lien' }
const canSubmit = computed(() => email.value.trim() && (mode.value === 'reset' || password.value.length >= 6))

const FEATURES = [
  { icon: Users, color: '#007aff', title: 'À plusieurs', text: 'Hôtels, restos et activités partagés avec tes compagnons de route.' },
  { icon: CalendarDays, color: '#ff3b30', title: 'Jour par jour', text: 'Un planning clair, nuit par nuit, étape par étape.' },
  { icon: Sparkles, color: '#bf5af2', title: 'Assistant IA', text: 'Colle un mail de réservation, demande des idées, planifie ta liste d’envies.' }
]

function setMode(m) {
  mode.value = m
  error.value = ''
  info.value = ''
  if (m !== 'welcome') {
    try { localStorage.setItem(WELCOMED_KEY, '1') } catch {}
    nextTick(() => document.querySelector('form input')?.focus())
  }
}

async function submit() {
  if (!canSubmit.value || loading.value) return
  error.value = ''
  info.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
    } else if (mode.value === 'register') {
      await auth.register(email.value, password.value, name.value)
      toast.success('Bienvenue à bord !')
    } else {
      await auth.resetPassword(email.value)
      info.value = 'Si un compte existe pour cette adresse, tu vas recevoir un lien de réinitialisation.'
      loading.value = false
      return
    }
  } catch (e) {
    error.value = e.message
    loading.value = false
    return
  }
  // Keep the spinner on until the trips page replaces this one
  router.replace({ name: 'trips' })
}
</script>

<template>
  <div>
  <!-- Welcome, Apple onboarding style -->
  <main v-if="mode === 'welcome'" class="min-h-[100dvh] flex flex-col px-8 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] max-w-md mx-auto">
    <div class="flex-1">
      <div class="flex justify-center">
        <AppLogo :size="92" class="rounded-[21px] shadow-lift" />
      </div>
      <h1 class="t-large text-center mt-7 [text-wrap:balance]">Bienvenue dans Vacayo</h1>
      <ul class="mt-10 space-y-7">
        <li v-for="f in FEATURES" :key="f.title" class="flex gap-4 items-start">
          <component :is="f.icon" class="w-9 h-9 flex-shrink-0 mt-0.5" :style="{ color: f.color }" :stroke-width="1.8" />
          <div>
            <p class="t-headline">{{ f.title }}</p>
            <p class="t-subhead text-muted mt-0.5">{{ f.text }}</p>
          </div>
        </li>
      </ul>
    </div>
    <div class="pt-8">
      <button type="button" class="btn btn-primary w-full" @click="setMode('register')">Créer un compte</button>
      <button type="button" class="btn btn-plain w-full mt-1" @click="setMode('login')">J’ai déjà un compte</button>
    </div>
  </main>

  <!-- Sign in / sign up / reset -->
  <main v-else class="min-h-[100dvh] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
    <header class="h-11 mt-[env(safe-area-inset-top)] px-2 flex items-center max-w-md mx-auto">
      <button v-if="mode === 'reset'" type="button" class="flex items-center h-11 pr-2 text-tint active:opacity-40" @click="setMode('login')">
        <ChevronLeft class="w-7 h-7" :stroke-width="2.4" /><span class="t-body -ml-0.5">Connexion</span>
      </button>
      <button v-else type="button" class="flex items-center h-11 pr-2 text-tint active:opacity-40" @click="setMode('welcome')">
        <ChevronLeft class="w-7 h-7" :stroke-width="2.4" /><span class="t-body -ml-0.5">Accueil</span>
      </button>
    </header>

    <div class="max-w-md mx-auto">
      <div class="px-4 pt-1 pb-6 flex items-center gap-3">
        <AppLogo :size="40" class="rounded-[9px]" />
        <h1 class="t-large">{{ TITLES[mode] }}</h1>
      </div>

      <form @submit.prevent="submit">
        <div class="list">
          <label v-if="mode === 'register'" class="row">
            <span class="t-body w-[7.5rem] flex-shrink-0">Prénom</span>
            <input v-model="name" type="text" autocomplete="given-name" placeholder="Facultatif" class="field" />
          </label>
          <label class="row">
            <span class="t-body w-[7.5rem] flex-shrink-0">E-mail</span>
            <input v-model="email" type="email" required autocomplete="email" inputmode="email" autocapitalize="off" placeholder="nom@exemple.com" class="field" />
          </label>
          <label v-if="mode !== 'reset'" class="row">
            <span class="t-body w-[7.5rem] flex-shrink-0">Mot de passe</span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="6"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              :placeholder="mode === 'register' ? '6 caractères min.' : 'Requis'"
              class="field"
            />
            <button type="button" class="text-subtle -mr-1" :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" class="w-5 h-5" :stroke-width="2" />
              <Eye v-else class="w-5 h-5" :stroke-width="2" />
            </button>
          </label>
        </div>
        <p v-if="error" role="alert" class="list-footer !text-[color:var(--vc-red)]">{{ error }}</p>
        <p v-else-if="info" role="status" class="list-footer" style="color: var(--vc-green)">{{ info }}</p>
        <p v-else-if="mode === 'reset'" class="list-footer">On t’envoie un lien pour choisir un nouveau mot de passe.</p>

        <div class="px-4 mt-8">
          <button type="submit" class="btn btn-primary w-full" :disabled="!canSubmit || loading">
            <van-loading v-if="loading" size="20" color="#fff" />
            <template v-else>{{ CTA[mode] }}</template>
          </button>
          <button v-if="mode === 'login'" type="button" class="btn btn-plain w-full mt-1" @click="setMode('reset')">Mot de passe oublié ?</button>
        </div>
      </form>

      <p v-if="mode === 'login'" class="t-subhead text-muted text-center mt-6">
        Pas encore de compte ?
        <button type="button" class="text-tint font-medium" @click="setMode('register')">Créer un compte</button>
      </p>
      <p v-else-if="mode === 'register'" class="t-subhead text-muted text-center mt-6">
        Déjà inscrit ?
        <button type="button" class="text-tint font-medium" @click="setMode('login')">Se connecter</button>
      </p>
    </div>
  </main>
  </div>
</template>

<style scoped>
.field { @apply flex-1 min-w-0 bg-transparent outline-none; font-size: 17px; color: var(--vc-text); }
.field::placeholder { color: var(--vc-subtle); }
.row { --sep-inset: 16px; }
.row:active { background: transparent; }
</style>
