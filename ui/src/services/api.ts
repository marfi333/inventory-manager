import type {
  Category,
  Item,
  Label,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateItemRequest,
  UpdateItemRequest,
  CreateLabelRequest,
  UpdateLabelRequest,
  UpdateQuantityRequest,
  ApiResponse,
} from '../types'
import { v4 as uuidv4 } from 'uuid'
import {
  cacheCategories,
  cacheItems,
  cacheLabels,
  deleteCachedCategory,
  deleteCachedItem,
  deleteCachedLabel,
  getCachedCategories,
  getCachedCategory,
  getCachedItem,
  getCachedItems,
  getCachedItemsByCategory,
  getCachedLabel,
  getCachedLabels,
  putCachedCategory,
  putCachedItem,
  putCachedLabel,
} from './cache'
import { db } from './db'
import { enqueue, rewriteClientId } from './outbox'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)

const isOffline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine === false

const nowIso = (): string => new Date(Date.now()).toISOString()

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const response = await fetch(url, { ...defaultOptions, ...options })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await this.request<Category[]>('/categories')
      const data = response.data || []
      await cacheCategories(data)
      return getCachedCategories()
    } catch (err) {
      if (isNetworkError(err)) {
        return getCachedCategories()
      }
      throw err
    }
  }

  async getCategory(id: string): Promise<Category> {
    try {
      const response = await this.request<Category>(`/categories/${id}`)
      if (!response.data) {
        throw new Error('Category not found')
      }
      await putCachedCategory(response.data)
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await getCachedCategory(id)
        if (cached) return cached
      }
      throw err
    }
  }

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const clientId = uuidv4()
    const optimistic: Category = {
      id: clientId,
      name: data.name,
      description: data.description,
      labelIds: data.labelIds ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await putCachedCategory(optimistic, isOffline() ? 'pending' : 'synced')

    try {
      const response = await this.request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!response.data) {
        throw new Error('Failed to create category')
      }
      await db.transaction('rw', db.categories, db.mutations, async () => {
        await deleteCachedCategory(clientId)
        await putCachedCategory(response.data!)
        await rewriteClientId(clientId, response.data!.id, 'category')
      })
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        await putCachedCategory(optimistic, 'pending')
        await enqueue({
          method: 'POST',
          url: '/categories',
          body: data,
          resource: 'category',
          clientId,
        })
        return optimistic
      }
      await deleteCachedCategory(clientId)
      throw err
    }
  }

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const existing = await getCachedCategory(id)
    if (existing) {
      await putCachedCategory(
        { ...existing, ...data, updatedAt: nowIso() },
        isOffline() ? 'pending' : 'synced',
      )
    }

    try {
      const response = await this.request<Category>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (!response.data) {
        throw new Error('Failed to update category')
      }
      await putCachedCategory(response.data)
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        if (existing) {
          await putCachedCategory({ ...existing, ...data, updatedAt: nowIso() }, 'pending')
        }
        await enqueue({
          method: 'PUT',
          url: `/categories/${id}`,
          body: data,
          resource: 'category',
          resourceId: id,
        })
        return (await getCachedCategory(id)) ?? (existing as Category)
      }
      throw err
    }
  }

  async deleteCategory(id: string): Promise<void> {
    const existing = await getCachedCategory(id)
    await deleteCachedCategory(id)

    try {
      await this.request(`/categories/${id}`, {
        method: 'DELETE',
      })
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          method: 'DELETE',
          url: `/categories/${id}`,
          resource: 'category',
          resourceId: id,
        })
        return
      }
      if (existing) {
        await putCachedCategory(existing)
      }
      throw err
    }
  }

  async getItems(): Promise<Item[]> {
    try {
      const response = await this.request<Item[]>('/items')
      const data = response.data || []
      await cacheItems(data)
      return getCachedItems()
    } catch (err) {
      if (isNetworkError(err)) {
        return getCachedItems()
      }
      throw err
    }
  }

  async getItem(id: string): Promise<Item> {
    try {
      const response = await this.request<Item>(`/items/${id}`)
      if (!response.data) {
        throw new Error('Item not found')
      }
      await putCachedItem(response.data)
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await getCachedItem(id)
        if (cached) return cached
      }
      throw err
    }
  }

  async getItemsByCategory(categoryId: string): Promise<Item[]> {
    try {
      const response = await this.request<Item[]>(`/items/category/${categoryId}`)
      return response.data || []
    } catch (err) {
      if (isNetworkError(err)) {
        return getCachedItemsByCategory(categoryId)
      }
      throw err
    }
  }

  async createItem(data: CreateItemRequest): Promise<Item> {
    const clientId = uuidv4()
    const optimistic: Item = {
      id: clientId,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      quantity: data.quantity,
      skus: data.skus,
      labelIds: data.labelIds ?? [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await putCachedItem(optimistic, isOffline() ? 'pending' : 'synced')

    try {
      const response = await this.request<Item>('/items', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!response.data) {
        throw new Error('Failed to create item')
      }
      await db.transaction('rw', db.items, db.mutations, async () => {
        await deleteCachedItem(clientId)
        await putCachedItem(response.data!)
        await rewriteClientId(clientId, response.data!.id, 'item')
      })
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        await putCachedItem(optimistic, 'pending')
        await enqueue({
          method: 'POST',
          url: '/items',
          body: data,
          resource: 'item',
          clientId,
        })
        return optimistic
      }
      await deleteCachedItem(clientId)
      throw err
    }
  }

  async updateItem(id: string, data: UpdateItemRequest): Promise<Item> {
    const existing = await getCachedItem(id)
    if (existing) {
      await putCachedItem(
        { ...existing, ...data, updatedAt: nowIso() },
        isOffline() ? 'pending' : 'synced',
      )
    }

    try {
      const response = await this.request<Item>(`/items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (!response.data) {
        throw new Error('Failed to update item')
      }
      await putCachedItem(response.data)
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        if (existing) {
          await putCachedItem({ ...existing, ...data, updatedAt: nowIso() }, 'pending')
        }
        await enqueue({
          method: 'PUT',
          url: `/items/${id}`,
          body: data,
          resource: 'item',
          resourceId: id,
        })
        return (await getCachedItem(id)) ?? (existing as Item)
      }
      throw err
    }
  }

  async updateItemQuantity(id: string, data: UpdateQuantityRequest): Promise<Item> {
    const existing = await getCachedItem(id)
    const optimistic = existing
      ? {
          ...existing,
          quantity:
            data.operation === 'set'
              ? data.quantity
              : data.operation === 'add'
                ? existing.quantity + data.quantity
                : Math.max(0, existing.quantity - data.quantity),
          updatedAt: nowIso(),
        }
      : null
    if (optimistic) {
      await putCachedItem(optimistic, isOffline() ? 'pending' : 'synced')
    }

    try {
      const response = await this.request<Item>(`/items/${id}/quantity`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      if (!response.data) {
        throw new Error('Failed to update item quantity')
      }
      await putCachedItem(response.data)
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        if (optimistic) {
          await putCachedItem(optimistic, 'pending')
        }
        await enqueue({
          method: 'PATCH',
          url: `/items/${id}/quantity`,
          body: data,
          resource: 'item',
          resourceId: id,
        })
        return (await getCachedItem(id)) ?? (existing as Item)
      }
      throw err
    }
  }

  async deleteItem(id: string): Promise<void> {
    const existing = await getCachedItem(id)
    await deleteCachedItem(id)

    try {
      await this.request(`/items/${id}`, {
        method: 'DELETE',
      })
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          method: 'DELETE',
          url: `/items/${id}`,
          resource: 'item',
          resourceId: id,
        })
        return
      }
      if (existing) {
        await putCachedItem(existing)
      }
      throw err
    }
  }

  async getLabels(): Promise<Label[]> {
    try {
      const response = await this.request<Label[]>('/labels')
      const data = response.data || []
      await cacheLabels(data)
      return getCachedLabels()
    } catch (err) {
      if (isNetworkError(err)) {
        return getCachedLabels()
      }
      throw err
    }
  }

  async createLabel(data: CreateLabelRequest): Promise<Label> {
    const clientId = uuidv4()
    const optimistic: Label = {
      id: clientId,
      name: data.name,
      color: data.color || 'slate',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    await putCachedLabel(optimistic, isOffline() ? 'pending' : 'synced')

    try {
      const response = await this.request<Label>('/labels', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      if (!response.data) throw new Error('Failed to create label')
      await db.transaction('rw', db.labels, db.mutations, async () => {
        await deleteCachedLabel(clientId)
        await putCachedLabel(response.data!)
        await rewriteClientId(clientId, response.data!.id, 'label')
      })
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        await putCachedLabel(optimistic, 'pending')
        await enqueue({
          method: 'POST',
          url: '/labels',
          body: data,
          resource: 'label',
          clientId,
        })
        return optimistic
      }
      await deleteCachedLabel(clientId)
      throw err
    }
  }

  async updateLabel(id: string, data: UpdateLabelRequest): Promise<Label> {
    const existing = await getCachedLabel(id)
    if (existing) {
      await putCachedLabel(
        { ...existing, ...data, updatedAt: nowIso() },
        isOffline() ? 'pending' : 'synced',
      )
    }
    try {
      const response = await this.request<Label>(`/labels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      if (!response.data) throw new Error('Failed to update label')
      await putCachedLabel(response.data)
      return response.data
    } catch (err) {
      if (isNetworkError(err)) {
        if (existing) {
          await putCachedLabel({ ...existing, ...data, updatedAt: nowIso() }, 'pending')
        }
        await enqueue({
          method: 'PUT',
          url: `/labels/${id}`,
          body: data,
          resource: 'label',
          resourceId: id,
        })
        return (await getCachedLabel(id)) ?? (existing as Label)
      }
      throw err
    }
  }

  async deleteLabel(id: string): Promise<void> {
    const existing = await getCachedLabel(id)
    await deleteCachedLabel(id)
    try {
      await this.request(`/labels/${id}`, { method: 'DELETE' })
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueue({
          method: 'DELETE',
          url: `/labels/${id}`,
          resource: 'label',
          resourceId: id,
        })
        return
      }
      if (existing) {
        await putCachedLabel(existing)
      }
      throw err
    }
  }
}

export const apiService = new ApiService()
