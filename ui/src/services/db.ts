import { Dexie, type EntityTable } from 'dexie'
import type { CachedCategory, CachedItem, OutboxMutation } from '../types/db'

export class InventoryDB extends Dexie {
  items!: EntityTable<CachedItem, 'id'>
  categories!: EntityTable<CachedCategory, 'id'>
  mutations!: EntityTable<OutboxMutation, 'id'>

  constructor() {
    super('inventory-manager')

    this.version(1).stores({
      items: 'id, _clientId, _syncStatus, categoryId, _localUpdatedAt',
      categories: 'id, _clientId, _syncStatus, _localUpdatedAt',
      mutations: '++id, status, resource, createdAt, clientId',
    })
  }
}

export const db = new InventoryDB()
