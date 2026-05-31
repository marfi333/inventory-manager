import { ref } from 'vue'

const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

let listenersAttached = false

function attachListeners() {
  if (listenersAttached || typeof window === 'undefined') return
  listenersAttached = true
  window.addEventListener('online', () => {
    isOnline.value = true
  })
  window.addEventListener('offline', () => {
    isOnline.value = false
  })
}

attachListeners()

export function useNetworkStatus() {
  return { isOnline }
}
