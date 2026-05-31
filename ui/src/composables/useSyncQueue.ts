import { onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import type { Category, Item } from '../types'
import type { OutboxMutation } from '../types/db'
import {
  deleteCachedCategory,
  deleteCachedItem,
  putCachedCategory,
  putCachedItem,
} from '../services/cache'
import { db } from '../services/db'
import {
  markFailed,
  markInFlight,
  markSynced,
  peekPending,
  rewriteClientId,
} from '../services/outbox'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

let draining = false

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)

type ApiEnvelope<T> = { data?: T; error?: string }

async function replayMutation(mutation: OutboxMutation): Promise<void> {
  const url = `${API_BASE_URL}${mutation.url}`
  const init: RequestInit = {
    method: mutation.method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (mutation.body !== undefined && mutation.method !== 'DELETE') {
    init.body = JSON.stringify(mutation.body)
  }

  const response = await fetch(url, init)

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ApiEnvelope<unknown>
    const message = errorData.error || `HTTP error ${response.status}`
    throw Object.assign(new Error(message), { status: response.status })
  }

  if (mutation.method === 'DELETE') {
    return
  }

  const envelope = (await response.json().catch(() => ({}))) as ApiEnvelope<Item | Category>
  const serverRow = envelope.data
  if (!serverRow) return

  if (mutation.resource === 'item') {
    await db.transaction('rw', db.items, db.mutations, async () => {
      if (mutation.clientId) {
        await deleteCachedItem(mutation.clientId)
        await rewriteClientId(mutation.clientId, serverRow.id, 'item')
      }
      await putCachedItem(serverRow as Item)
    })
  } else {
    await db.transaction('rw', db.categories, db.mutations, async () => {
      if (mutation.clientId) {
        await deleteCachedCategory(mutation.clientId)
        await rewriteClientId(mutation.clientId, serverRow.id, 'category')
      }
      await putCachedCategory(serverRow as Category)
    })
  }
}

export async function drainQueue(): Promise<void> {
  if (draining) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  draining = true
  let synced = 0
  let failed = 0

  try {
    const pending = await peekPending()
    for (const mutation of pending) {
      if (mutation.id === undefined) continue

      await markInFlight(mutation.id)

      try {
        await replayMutation(mutation)
        await markSynced(mutation.id)
        synced += 1
      } catch (err) {
        if (isNetworkError(err)) {
          await markFailed(mutation.id, 'Network error during replay')
          break
        }
        const message = err instanceof Error ? err.message : 'Unknown error'
        await markFailed(mutation.id, message)
        failed += 1
        toast.error(`Sync failed: ${describeMutation(mutation)}`, { description: message })
      }
    }
  } finally {
    draining = false
  }

  if (synced > 0) {
    toast.success(`${synced} change${synced === 1 ? '' : 's'} synced`)
  }
  if (failed > 0 && synced === 0) {
    // toast.error already shown per failure; nothing else to surface here
  }
}

function describeMutation(mutation: OutboxMutation): string {
  const verb =
    mutation.method === 'POST'
      ? 'create'
      : mutation.method === 'DELETE'
        ? 'delete'
        : 'update'
  return `${verb} ${mutation.resource}`
}

export function useSyncQueue() {
  const onOnline = () => {
    void drainQueue()
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      void drainQueue()
    }
  }

  onMounted(() => {
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    void drainQueue()
  })

  onUnmounted(() => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return { drainQueue }
}
