import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/', name: 'trips', component: () => import('@/views/TripsListView.vue') },
  { path: '/trips/:id', name: 'trip', component: () => import('@/views/TripDetailView.vue'), props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() { return { top: 0 } }
})

async function waitForAuthReady(auth) {
  if (auth.ready) return
  await new Promise(resolve => {
    const stop = setInterval(() => {
      if (auth.ready) { clearInterval(stop); resolve() }
    }, 30)
  })
}

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await waitForAuthReady(auth)
  if (!to.meta.public && !auth.isAuthenticated) return { name: 'login' }
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'trips' }
})

export default router
