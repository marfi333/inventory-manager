import type { Category, Item, Label } from '../types'
import type { CachedCategory, CachedItem, CachedLabel } from '../types/db'
import { db } from './db'

const now = () => Date.now()

const toCachedItem = (item: Item, status: 'synced' | 'pending' = 'synced'): CachedItem => ({
  ...item,
  labelIds: item.labelIds ?? [],
  _syncStatus: status,
  _localUpdatedAt: now(),
})

const toCachedCategory = (
  category: Category,
  status: 'synced' | 'pending' = 'synced'
): CachedCategory => ({
  ...category,
  labelIds: category.labelIds ?? [],
  _syncStatus: status,
  _localUpdatedAt: now(),
})

const toCachedLabel = (
  label: Label,
  status: 'synced' | 'pending' = 'synced'
): CachedLabel => ({
  ...label,
  _syncStatus: status,
  _localUpdatedAt: now(),
})

/**
 * Replace the cache with the server's view, but never clobber rows whose
 * local copy still has unsynced changes. Pending/failed rows survive a
 * refresh; the outbox replay is what reconciles them with the server.
 */
export async function cacheItems(items: Item[]): Promise<void> {
  await db.transaction('rw', db.items, async () => {
    const existingDirty = await db.items
      .where('_syncStatus')
      .anyOf('pending', 'failed')
      .toArray()
    const dirtyIds = new Set(existingDirty.map((row) => row.id))

    const incoming = items.filter((item) => !dirtyIds.has(item.id)).map((item) => toCachedItem(item))

    if (incoming.length > 0) {
      await db.items.bulkPut(incoming)
    }
  })
}

export async function cacheCategories(categories: Category[]): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const existingDirty = await db.categories
      .where('_syncStatus')
      .anyOf('pending', 'failed')
      .toArray()
    const dirtyIds = new Set(existingDirty.map((row) => row.id))

    const incoming = categories
      .filter((cat) => !dirtyIds.has(cat.id))
      .map((cat) => toCachedCategory(cat))

    if (incoming.length > 0) {
      await db.categories.bulkPut(incoming)
    }
  })
}

export async function getCachedItems(): Promise<CachedItem[]> {
  return db.items.toArray()
}

export async function getCachedCategories(): Promise<CachedCategory[]> {
  return db.categories.toArray()
}

export async function getCachedItem(id: string): Promise<CachedItem | undefined> {
  return db.items.get(id)
}

export async function getCachedCategory(id: string): Promise<CachedCategory | undefined> {
  return db.categories.get(id)
}

export async function getCachedItemsByCategory(categoryId: string): Promise<CachedItem[]> {
  return db.items.where('categoryId').equals(categoryId).toArray()
}

export async function putCachedItem(
  item: Item,
  status: 'synced' | 'pending' = 'synced'
): Promise<void> {
  await db.items.put(toCachedItem(item, status))
}

export async function putCachedCategory(
  category: Category,
  status: 'synced' | 'pending' = 'synced'
): Promise<void> {
  await db.categories.put(toCachedCategory(category, status))
}

export async function deleteCachedItem(id: string): Promise<void> {
  await db.items.delete(id)
}

export async function deleteCachedCategory(id: string): Promise<void> {
  await db.categories.delete(id)
}

export async function cacheLabels(labels: Label[]): Promise<void> {
  await db.transaction('rw', db.labels, async () => {
    const existingDirty = await db.labels
      .where('_syncStatus')
      .anyOf('pending', 'failed')
      .toArray()
    const dirtyIds = new Set(existingDirty.map((row) => row.id))
    const incoming = labels.filter((l) => !dirtyIds.has(l.id)).map((l) => toCachedLabel(l))
    if (incoming.length > 0) await db.labels.bulkPut(incoming)
  })
}

export async function getCachedLabels(): Promise<CachedLabel[]> {
  return db.labels.toArray()
}

export async function getCachedLabel(id: string): Promise<CachedLabel | undefined> {
  return db.labels.get(id)
}

export async function putCachedLabel(
  label: Label,
  status: 'synced' | 'pending' = 'synced'
): Promise<void> {
  await db.labels.put(toCachedLabel(label, status))
}

export async function deleteCachedLabel(id: string): Promise<void> {
  await db.labels.delete(id)
}
