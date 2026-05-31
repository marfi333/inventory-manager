import { computed } from 'vue'
import { db } from '../services/db'
import type { CachedCategory, CachedItem, SyncStatus } from '../types/db'
import { useLiveQuery } from './useLiveQuery'

/**
 * Reactive map of resource id → sync status, derived from the Dexie cache.
 * A row that's missing or marked 'synced' simply isn't in the map (template
 * code can treat absence as "synced / nothing to show"). Used by per-row
 * status dots to render colour without each row owning its own subscription.
 */
function buildMap(rows: ReadonlyArray<CachedItem | CachedCategory>): Map<string, SyncStatus> {
  const map = new Map<string, SyncStatus>()
  for (const row of rows) {
    if (row._syncStatus && row._syncStatus !== 'synced') {
      map.set(row.id, row._syncStatus)
    }
  }
  return map
}

export function useItemSyncStatus() {
  const rows = useLiveQuery<CachedItem[]>(() =>
    db.items.where('_syncStatus').anyOf('pending', 'failed').toArray(),
  )
  return computed(() => buildMap(rows.value ?? []))
}

export function useCategorySyncStatus() {
  const rows = useLiveQuery<CachedCategory[]>(() =>
    db.categories.where('_syncStatus').anyOf('pending', 'failed').toArray(),
  )
  return computed(() => buildMap(rows.value ?? []))
}
