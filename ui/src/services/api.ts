import type {
  Category,
  Item,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateItemRequest,
  UpdateItemRequest,
  UpdateQuantityRequest,
  ApiResponse,
} from '../types'
import {
  cacheCategories,
  cacheItems,
  getCachedCategories,
  getCachedCategory,
  getCachedItem,
  getCachedItems,
  getCachedItemsByCategory,
  putCachedCategory,
  putCachedItem,
} from './cache'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false)

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
      return data
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
    const response = await this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.data) {
      throw new Error('Failed to create category')
    }
    return response.data
  }

  async updateCategory(id: string, data: UpdateCategoryRequest): Promise<Category> {
    const response = await this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (!response.data) {
      throw new Error('Failed to update category')
    }
    return response.data
  }

  async deleteCategory(id: string): Promise<void> {
    await this.request(`/categories/${id}`, {
      method: 'DELETE',
    })
  }

  async getItems(): Promise<Item[]> {
    try {
      const response = await this.request<Item[]>('/items')
      const data = response.data || []
      await cacheItems(data)
      return data
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
    const response = await this.request<Item>('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.data) {
      throw new Error('Failed to create item')
    }
    return response.data
  }

  async updateItem(id: string, data: UpdateItemRequest): Promise<Item> {
    const response = await this.request<Item>(`/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (!response.data) {
      throw new Error('Failed to update item')
    }
    return response.data
  }

  async updateItemQuantity(id: string, data: UpdateQuantityRequest): Promise<Item> {
    const response = await this.request<Item>(`/items/${id}/quantity`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    if (!response.data) {
      throw new Error('Failed to update item quantity')
    }
    return response.data
  }

  async deleteItem(id: string): Promise<void> {
    await this.request(`/items/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiService = new ApiService()
