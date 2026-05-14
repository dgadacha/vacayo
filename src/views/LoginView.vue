<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Plane, Mail, Lock, ArrowRight, Loader2, Check } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const mode = ref('login')
const email = ref('')
const password = ref('')
const error = ref('')
const info = ref('')
const loading = ref(false)

const title = computed(() => ({
  login: 'Se connecter',
  register: 'Créer un compte',
  reset: 'Mot de passe oublié'
}[mode.value]))

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
      toast.success('Connecté')
      router.replace({ name: 'trips' })
    } else if (mode.value === 'register') {
      await auth.register(email.value, password.value)
      toast.success('Compte créé')
      router.replace({ name: 'trips' })
    } else {
      await auth.resetPassword(email.value)
      info.value = 'Email envoyé. Vérifie ta boîte mail.'
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
</script>

<template>
  <main class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
    <div class="absolute top-3 right-3 safe-top">
      <ThemeToggle />
    </div>
    <div class="flex-1 flex items-center justify-center px-6 py-12">
      <div class="w-full max-w-sm">
        <div class="flex flex-col items-center mb-10">
          <div class="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Plane class="w-7 h-7" :stroke-width="1.75" />
          </div>
          <h1 class="mt-5 text-3xl font-bold tracking-tight">Vacayo</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ title }}</p>
        </div>

        <form @submit.prevent="submit" class="card p-6 space-y-4">
          <div>
            <label class="label">Email</label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
              <input v-model="email" type="email" autocomplete="email" required class="input pl-10" placeholder="toi@email.com" />
            </div>
          </div>

          <div v-if="mode !== 'reset'">
            <label class="label">Mot de passe</label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" :stroke-width="2" />
              <input v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required minlength="6" class="input pl-10" placeholder="••••••••" />
            </div>
          </div>

          <p v-if="error" class="text-sm text-red-600 bg-red-50 ring-1 ring-red-100 dark:bg-red-950/50 dark:ring-red-900 dark:text-red-400 rounded-lg px-3 py-2">{{ error }}</p>
          <p v-if="info" class="text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-900 dark:text-emerald-400 rounded-lg px-3 py-2 flex items-start gap-2">
            <Check class="w-4 h-4 mt-0.5 flex-shrink-0" :stroke-width="2.5" />
            <span>{{ info }}</span>
          </p>

          <button :disabled="loading" type="submit" class="btn-primary w-full py-3 text-[15px]">
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" :stroke-width="2.5" />
            <template v-else>
              {{ cta }}
              <ArrowRight class="w-4 h-4" :stroke-width="2.5" />
            </template>
          </button>

          <div class="flex items-center justify-between text-xs pt-1 -mb-1">
            <button v-if="mode === 'login'" type="button" @click="setMode('reset')" class="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              Mot de passe oublié ?
            </button>
            <button v-if="mode !== 'login'" type="button" @click="setMode('login')" class="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100">
              ← Connexion
            </button>
            <button v-if="mode === 'login'" type="button" @click="setMode('register')" class="text-slate-900 dark:text-slate-100 font-semibold hover:underline ml-auto">
              Créer un compte
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>
