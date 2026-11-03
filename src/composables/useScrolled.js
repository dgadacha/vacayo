import { ref, onMounted, onBeforeUnmount } from 'vue'

// true once the window has scrolled past `threshold` px — drives the iOS
// "large title collapses into the navigation bar" behaviour.
export function useScrolled(threshold = 40) {
  const scrolled = ref(false)
  const update = () => { scrolled.value = window.scrollY > threshold }
  onMounted(() => { update(); window.addEventListener('scroll', update, { passive: true }) })
  onBeforeUnmount(() => window.removeEventListener('scroll', update))
  return scrolled
}
