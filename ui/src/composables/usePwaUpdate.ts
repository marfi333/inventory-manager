import { watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { toast } from 'vue-sonner'

export function usePwaUpdate() {
  const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(swUrl) {
      console.info('[pwa] service worker registered:', swUrl)
    },
    onRegisterError(error) {
      console.error('[pwa] service worker registration failed:', error)
    },
  })

  watch(offlineReady, (ready) => {
    if (!ready) return
    toast.success('App ready to work offline.')
  })

  watch(needRefresh, (refresh) => {
    if (!refresh) return
    toast('New version available', {
      description: 'Reload to get the latest version of the app.',
      duration: Infinity,
      action: {
        label: 'Reload',
        onClick: () => {
          void updateServiceWorker(true)
        },
      },
    })
  })

  return { offlineReady, needRefresh, updateServiceWorker }
}
