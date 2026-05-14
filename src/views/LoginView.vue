<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Plane, ArrowRight, Loader2 } from 'lucide-vue-next'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const mode = ref('login') // 'login' | 'register' | 'reset'
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
    <div class="absolute top-3 right-3 z-10 safe-top">
      <ThemeToggle />
    </div>

    <div class="flex-1 flex items-center justify-center px-5 py-12">
      <div class="w-full max-w-sm">
        <div class="flex flex-col items-center mb-8">
          <div class="w-14 h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
            <Plane class="w-7 h-7" :stroke-width="1.75" />
          </div>
          <h1 class="mt-5 text-3xl font-bold tracking-tight">Vacayo</h1>
          <p class="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{{ title }}</p>
        </div>

        <van-form @submit="submit">
          <van-cell-group inset>
            <van-field
              v-model="email"
              name="email"
              type="email"
              label="Email"
              placeholder="toi@email.com"
              autocomplete="email"
              :rules="[{ required: true, message: 'Email requis' }]"
              clearable
            />
            <van-field
              v-if="mode !== 'reset'"
              v-model="password"
              name="password"
              type="password"
              label="Mot de passe"
              placeholder="••••••••"
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              :rules="[{ required: true, message: 'Mot de passe requis' }, { pattern: /.{6,}/, message: 'Minimum 6 caractères' }]"
            />
          </van-cell-group>

          <p v-if="error" class="mx-4 mt-3 text-sm text-red-600 bg-red-50 ring-1 ring-red-100 dark:bg-red-950/50 dark:ring-red-900 dark:text-red-400 rounded-lg px-3 py-2">{{ error }}</p>
          <p v-if="info" class="mx-4 mt-3 text-sm text-emerald-700 bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:ring-emerald-900 dark:text-emerald-400 rounded-lg px-3 py-2">{{ info }}</p>

          <div class="px-4 mt-5">
            <van-button
              type="primary"
              size="large"
              block
              native-type="submit"
              :loading="loading"
              loading-text="Connexion…"
              round
            >
              {{ cta }}
              <template #icon v-if="!loading">
                <ArrowRight class="w-4 h-4 ml-1" :stroke-width="2.5" />
              </template>
            </van-button>
          </div>

          <div class="px-5 mt-4 flex items-center justify-between text-xs">
            <button v-if="mode === 'login'" type="button" @click="setMode('reset')" class="text-slate-500 dark:text-slate-400">
              Mot de passe oublié ?
            </button>
            <button v-if="mode !== 'login'" type="button" @click="setMode('login')" class="text-slate-500 dark:text-slate-400">
              ← Connexion
            </button>
            <button v-if="mode === 'login'" type="button" @click="setMode('register')" class="text-slate-900 dark:text-slate-100 font-semibold ml-auto">
              Créer un compte
            </button>
          </div>
        </van-form>
      </div>
    </div>
  </main>
</template>
