import type { Category, Item } from './index'

export type SyncStatus = 'synced' | 'pending' | 'failed'

export type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type MutationResource = 'item' | 'category'

export type MutationStatus = 'pending' | 'in_flight' | 'failed'

type LocalMeta = {
  _syncStatus: SyncStatus
  _clientId?: string
  _localUpdatedAt: number
}

export type CachedItem = Item & LocalMeta

export type CachedCategory = Category & LocalMeta

export type OutboxMutation = {
  id?: number
  method: MutationMethod
  url: string
  body?: unknown
  resource: MutationResource
  resourceId?: string
  clientId?: string
  status: MutationStatus
  attempts: number
  createdAt: number
  error?: string
}
