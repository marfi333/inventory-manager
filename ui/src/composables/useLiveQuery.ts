import { onUnmounted, ref, type Ref } from 'vue'
import { liveQuery } from 'dexie'

/**
 * Subscribe to a Dexie liveQuery and expose the latest value as a reactive ref.
 * Auto-unsubscribes on component unmount. Returns the ref undefined until the
 * first emission so callers can use `?? fallback` for initial render.
 */
export function useLiveQuery<T>(querier: () => T | Promise<T>): Ref<T | undefined> {
  const value = ref<T | undefined>(undefined) as Ref<T | undefined>
  const subscription = liveQuery(querier).subscribe({
    next: (v) => {
      value.value = v
    },
    error: (err) => {
      console.error('useLiveQuery error:', err)
    },
  })
  onUnmounted(() => subscription.unsubscribe())
  return value
}
