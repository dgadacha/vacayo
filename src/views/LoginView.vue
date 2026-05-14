<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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
      info.value = 'Email envoyé.'
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
  <main class="min-h-screen">
    <van-nav-bar :title="title" fixed safe-area-inset-top>
      <template #right>
        <ThemeToggle />
      </template>
    </van-nav-bar>

    <div style="padding-top: 80px;">
      <div class="text-center py-6">
        <van-icon name="logistics" size="48" />
        <h1 class="mt-2 text-2xl font-bold">Vacayo</h1>
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
            :rules="[{ required: true, message: 'Requis' }, { pattern: /.{6,}/, message: 'Minimum 6 caractères' }]"
          />
        </van-cell-group>

        <div v-if="error" class="px-4 mt-3">
          <van-notice-bar :text="error" color="#ee0a24" background="#ffebed" />
        </div>
        <div v-if="info" class="px-4 mt-3">
          <van-notice-bar :text="info" color="#07c160" background="#e5f8eb" />
        </div>

        <div class="px-4 mt-5">
          <van-button
            type="primary"
            size="large"
            block
            native-type="submit"
            :loading="loading"
            round
          >
            {{ cta }}
          </van-button>
        </div>

        <div class="px-5 mt-4 flex items-center justify-between text-sm">
          <van-button v-if="mode === 'login'" type="default" size="mini" plain hairline @click="setMode('reset')">
            Mot de passe oublié ?
          </van-button>
          <van-button v-if="mode !== 'login'" type="default" size="mini" plain hairline @click="setMode('login')">
            ← Connexion
          </van-button>
          <van-button v-if="mode === 'login'" type="primary" size="mini" plain hairline @click="setMode('register')" class="ml-auto">
            Créer un compte
          </van-button>
        </div>
      </van-form>
    </div>
  </main>
</template>
