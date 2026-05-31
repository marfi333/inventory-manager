import { Dexie, type EntityTable } from 'dexie'
import type { CachedCategory, CachedItem, CachedLabel, OutboxMutation } from '../types/db'

export class InventoryDB extends Dexie {
  items!: EntityTable<CachedItem, 'id'>
  categories!: EntityTable<CachedCategory, 'id'>
  labels!: EntityTable<CachedLabel, 'id'>
  mutations!: EntityTable<OutboxMutation, 'id'>

  constructor() {
    super('inventory-manager')

    this.version(1).stores({
      items: 'id, _clientId, _syncStatus, categoryId, _localUpdatedAt',
      categories: 'id, _clientId, _syncStatus, _localUpdatedAt',
      mutations: '++id, status, resource, createdAt, clientId',
    })

    this.version(2)
      .stores({
        items: 'id, _clientId, _syncStatus, categoryId, _localUpdatedAt',
        categories: 'id, _clientId, _syncStatus, _localUpdatedAt',
        labels: 'id, _clientId, _syncStatus, name, _localUpdatedAt',
        mutations: '++id, status, resource, createdAt, clientId',
      })
      .upgrade(async (tx) => {
        // Backfill labelIds=[] on existing rows.
        await tx.table('items').toCollection().modify((row: any) => {
          if (!Array.isArray(row.labelIds)) row.labelIds = []
        })
        await tx.table('categories').toCollection().modify((row: any) => {
          if (!Array.isArray(row.labelIds)) row.labelIds = []
        })
      })
  }
}

export const db = new InventoryDB()
