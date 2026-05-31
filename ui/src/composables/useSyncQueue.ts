import { onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import type { Category, Item } from '../types'
import type { OutboxMutation } from '../types/db'
import {
  deleteCachedCategory,
  deleteCachedItem,
  getCachedCategory,
  getCachedItem,
  putCachedCategory,
  putCachedItem,
} from '../services/cache'
import { db } from '../services/db'
import {
  discard as discardOutbox,
  markFailed,
  markInFlight,
  markSynced,
  peekPending,
  retry as retryOutbox,
  rewriteClientId,
} from '../services/outbox'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

let draining = false
let pendingRequest = false

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
  if (draining) {
    pendingRequest = true
    return
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return

  draining = true
  let synced = 0

  try {
    do {
      pendingRequest = false
      const pending = await peekPending()
      let networkLost = false

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
            networkLost = true
            break
          }
          const message = err instanceof Error ? err.message : 'Unknown error'
          await markFailed(mutation.id, message)
          const label = await describeMutation(mutation)
          toast.error(`Sync failed: ${label}`, { description: message })
        }
      }

      if (networkLost) break
    } while (pendingRequest)
  } finally {
    draining = false
    pendingRequest = false
  }

  if (synced > 0) {
    toast.success(`${synced} change${synced === 1 ? '' : 's'} synced`)
  }
}

async function describeMutation(mutation: OutboxMutation): Promise<string> {
  const verb =
    mutation.method === 'POST'
      ? 'create'
      : mutation.method === 'DELETE'
        ? 'delete'
        : 'update'
  const lookupId = mutation.resourceId ?? mutation.clientId
  const name = lookupId
    ? mutation.resource === 'item'
      ? (await getCachedItem(lookupId))?.name
      : (await getCachedCategory(lookupId))?.name
    : undefined
  return name ? `${verb} ${mutation.resource} '${name}'` : `${verb} ${mutation.resource}`
}

/**
 * Re-enqueue a failed mutation and trigger a drain. If a drain is already in
 * flight, drainQueue sets pendingRequest so the just-retried mutation is
 * picked up in a follow-up pass without dropping it on the floor.
 */
export async function retryMutation(id: number): Promise<void> {
  await retryOutbox(id)
  void drainQueue()
}

/**
 * Permanently drop a failed mutation. Cleans up the linked cache row so the
 * UI doesn't keep showing it:
 *   - failed CREATE: remove the orphan optimistic row keyed by clientId
 *   - failed UPDATE/PATCH: clear the dirty marker on the existing row by
 *     re-writing it with `_syncStatus: 'synced'`. The local copy may now
 *     diverge from the server until the next GET refresh, which is the
 *     accepted trade-off for "discard my offline change".
 *   - failed DELETE: same as UPDATE — the row is still in the cache; mark
 *     it synced so the user sees the row reappear cleanly.
 */
export async function discardMutation(mutation: OutboxMutation): Promise<void> {
  if (mutation.id === undefined) return

  if (mutation.method === 'POST' && mutation.clientId) {
    if (mutation.resource === 'item') {
      await deleteCachedItem(mutation.clientId)
    } else {
      await deleteCachedCategory(mutation.clientId)
    }
  } else if (mutation.resourceId) {
    if (mutation.resource === 'item') {
      const existing = await getCachedItem(mutation.resourceId)
      if (existing) await putCachedItem(existing, 'synced')
    } else {
      const existing = await getCachedCategory(mutation.resourceId)
      if (existing) await putCachedCategory(existing, 'synced')
    }
  }

  await discardOutbox(mutation.id)
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
