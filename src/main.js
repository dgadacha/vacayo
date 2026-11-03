import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Locale } from 'vant'
import frFR from 'vant/es/locale/lang/fr-FR'
import router from './router'
import App from './App.vue'
import './style.css'

// Vant defaults to Chinese (picker buttons, dialogs). Its French pack has a few
// typos and says "Confirmer" where iOS says "OK".
Locale.use('fr-FR', { ...frFR, confirm: 'OK', delete: 'Supprimer', clear: 'Effacer' })

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
