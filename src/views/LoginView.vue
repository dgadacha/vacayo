<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'
import AppLogo from '@/components/AppLogo.vue'
import { useToast } from '@/composables/useToast'
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Sparkles, CalendarDays, Users } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const mode = ref('login')
const name = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const info = ref('')
const loading = ref(false)

const cta = computed(() => ({
  login: 'Se connecter',
  register: 'Créer mon compte',
  reset: 'Envoyer le lien'
}[mode.value]))

async function submit() {
  error.value = ''
  info.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
      router.replace({ name: 'trips' })
    } else if (mode.value === 'register') {
      await auth.register(email.value, password.value, name.value)
      toast.success('Bienvenue à bord !')
      router.replace({ name: 'trips' })
    } else {
      await auth.resetPassword(email.value)
      info.value = 'Si un compte existe pour cet email, tu vas recevoir un lien de réinitialisation.'
    }
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function setMode(m) {
  mode.value = m
  error.value = ''
  info.value = ''
}

const PERKS = [
  { icon: Users, text: 'À plusieurs' },
  { icon: CalendarDays, text: 'Jour par jour' },
  { icon: Sparkles, text: 'Assistant IA' }
]
</script>

<template>
  <main class="min-h-screen flex flex-col">
    <header class="relative overflow-hidden text-white px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-20" style="background: linear-gradient(150deg, #4338ca 0%, #7c3aed 55%, #c026d3 100%)">
      <div class="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
      <div class="absolute bottom-0 -left-16 w-48 h-48 rounded-full bg-fuchsia-300/20 blur-2xl" />
      <div class="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] text-white">
        <ThemeToggle class="!text-white hover:!bg-white/15" />
      </div>

      <div class="relative max-w-md mx-auto">
        <div class="inline-flex p-1.5 rounded-2xl bg-white/15 backdrop-blur ring-1 ring-white/25">
          <AppLogo :size="44" />
        </div>
        <h1 class="mt-5 text-4xl font-extrabold tracking-tight">Vacayo</h1>
        <p class="mt-2 text-white/80 text-[15px] leading-relaxed max-w-xs">
          Hôtels, restos, activités et planning : prépare tes voyages à plusieurs, sans prise de tête.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <span v-for="p in PERKS" :key="p.text" class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
            <component :is="p.icon" class="w-3.5 h-3.5" :stroke-width="2" />{{ p.text }}
          </span>
        </div>
      </div>
    </header>

    <section class="relative -mt-10 flex-1 px-4 pb-10">
      <div class="card max-w-md mx-auto p-5 !rounded-3xl">
        <div v-if="mode !== 'reset'" class="segmented" role="tablist">
          <button type="button" :aria-pressed="mode === 'login'" @click="setMode('login')">Connexion</button>
          <button type="button" :aria-pressed="mode === 'register'" @click="setMode('register')">Inscription</button>
        </div>
        <div v-else>
          <button type="button" class="flex items-center gap-1.5 text-sm font-medium text-muted" @click="setMode('login')">
            <ArrowLeft class="w-4 h-4" :stroke-width="2" /> Retour
          </button>
          <h2 class="mt-3 text-lg font-bold">Mot de passe oublié</h2>
          <p class="text-sm text-muted mt-1">Entre ton email, on t'envoie un lien pour en choisir un nouveau.</p>
        </div>

        <form class="mt-5 space-y-3" @submit.prevent="submit">
          <label v-if="mode === 'register'" class="field">
            <User class="field-icon" :stroke-width="2" />
            <input v-model="name" type="text" autocomplete="given-name" placeholder="Ton prénom" aria-label="Prénom" />
          </label>
          <label class="field">
            <Mail class="field-icon" :stroke-width="2" />
            <input v-model="email" type="email" required autocomplete="email" inputmode="email" placeholder="Email" aria-label="Email" />
          </label>
          <label v-if="mode !== 'reset'" class="field">
            <Lock class="field-icon" :stroke-width="2" />
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="6"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              :placeholder="mode === 'register' ? 'Mot de passe (6 caractères min.)' : 'Mot de passe'"
              aria-label="Mot de passe"
            />
            <button type="button" class="btn-icon !w-8 !h-8 -mr-1" :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'" @click="showPassword = !showPassword">
              <EyeOff v-if="showPassword" class="w-4 h-4" :stroke-width="2" />
              <Eye v-else class="w-4 h-4" :stroke-width="2" />
            </button>
          </label>

          <p v-if="error" role="alert" class="rounded-xl px-3 py-2.5 text-sm bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{{ error }}</p>
          <p v-if="info" role="status" class="rounded-xl px-3 py-2.5 text-sm bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{{ info }}</p>

          <button type="submit" class="btn btn-primary w-full !h-12 !text-[15px]" :disabled="loading">
            <van-loading v-if="loading" size="18" color="currentColor" />
            <span v-else>{{ cta }}</span>
          </button>

          <div v-if="mode === 'login'" class="text-center pt-1">
            <button type="button" class="text-sm font-medium" style="color: var(--vc-primary)" @click="setMode('reset')">Mot de passe oublié ?</button>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.field {
  @apply flex items-center gap-3 rounded-xl px-3.5 h-12 transition;
  background: var(--vc-surface-2);
  border: 1px solid transparent;
}
.field:focus-within { border-color: var(--vc-primary); background: var(--vc-surface); }
.field input { @apply flex-1 min-w-0 bg-transparent outline-none text-[15px]; color: var(--vc-text); }
.field input::placeholder { color: var(--vc-subtle); }
.field-icon { @apply w-[18px] h-[18px] flex-shrink-0; color: var(--vc-subtle); }
</style>
