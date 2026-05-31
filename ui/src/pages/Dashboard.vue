<template>
  <div class="pb-10 space-y-6">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Dashboard</h1>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Overview of your inventory system</p>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-24">
      <i class="text-4xl text-indigo-600 pi pi-spinner pi-spin dark:text-indigo-400"></i>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        class="p-4 transition-all duration-200 bg-white border rounded-lg shadow-sm sm:p-6 hover:shadow-md dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg sm:w-12 sm:h-12 dark:bg-indigo-900/50"
            >
              <i class="text-lg text-indigo-600 sm:text-xl pi pi-folder dark:text-indigo-400"></i>
            </div>
          </div>
          <div class="ml-3 sm:ml-4">
            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Total Categories</p>
            <p class="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-white">{{ stats.totalCategories }}</p>
          </div>
        </div>
      </div>

      <div
        class="p-4 transition-all duration-200 bg-white border rounded-lg shadow-sm sm:p-6 hover:shadow-md dark:bg-slate-800 border-slate-200 dark:border-slate-700"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="flex items-center justify-center w-10 h-10 rounded-lg sm:w-12 sm:h-12 bg-emerald-100 dark:bg-emerald-900/50"
            >
              <i class="text-lg sm:text-xl pi pi-box text-emerald-600 dark:text-emerald-400"></i>
            </div>
          </div>
          <div class="ml-3 sm:ml-4">
            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Total Items</p>
            <p class="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-white">{{ stats.totalItems }}</p>
          </div>
        </div>
      </div>

      <div
        class="p-4 transition-all duration-200 bg-white border rounded-lg shadow-sm sm:p-6 hover:shadow-md dark:bg-slate-800 border-slate-200 dark:border-slate-700 sm:col-span-2 lg:col-span-1"
      >
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div
              class="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-lg sm:w-12 sm:h-12 dark:bg-purple-900/50"
            >
              <i class="text-lg text-purple-600 sm:text-xl pi pi-chart-line dark:text-purple-400"></i>
            </div>
          </div>
          <div class="ml-3 sm:ml-4">
            <p class="text-sm font-medium text-slate-600 dark:text-slate-400">Total Stock</p>
            <p class="text-xl font-semibold sm:text-2xl text-slate-900 dark:text-white">{{ stats.totalStock }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white border rounded-lg shadow-sm dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <div class="p-4 border-b sm:p-6 border-slate-200 dark:border-slate-700">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-white">Recent Items</h2>
        <p class="text-sm text-slate-600 dark:text-slate-400">Latest items added to your inventory</p>
      </div>

      <div class="divide-y divide-slate-200 dark:divide-slate-700">
        <div
          v-for="item in recentItems"
          :key="item.id"
          class="p-4 transition-colors duration-200 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center flex-1 space-x-3 sm:space-x-4">
              <div
                class="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg sm:w-10 sm:h-10 dark:bg-indigo-900/50"
              >
                <i class="text-indigo-600 pi pi-box dark:text-indigo-400"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate text-slate-900 dark:text-white">{{ item.name }}</p>
                <p class="text-sm truncate text-slate-500 dark:text-slate-400">
                  {{ item.description || 'No description' }}
                </p>
              </div>
            </div>
            <div class="flex flex-col items-end justify-end flex-shrink-0 ml-4 text-right">
              <div class="flex items-center mb-1.5 text-sm font-medium text-slate-900 dark:text-white w-fit">
                <span>{{ item.quantity }}</span>
                <i class="ml-2 text-xs pi pi-hashtag"></i>
              </div>
              <div class="flex items-center text-xs text-slate-500 dark:text-slate-400">
                <span class="truncate max-w-[100px] sm:max-w-none">{{
                  item.skus.length > 0 ? item.skus.join(', ') : 'No SKUs'
                }}</span>
                <i class="ml-2 text-xs pi pi-tag"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { apiService } from '../services/api'
import type { Category, Item } from '../types'

const loading = ref(true)
const categories = ref<Category[]>([])
const items = ref<Item[]>([])

const stats = computed(() => ({
  totalCategories: categories.value.length,
  totalItems: items.value.length,
  totalStock: items.value.reduce((sum, item) => sum + item.quantity, 0),
}))

const recentItems = computed(() =>
  items.value.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5),
)

const loadData = async () => {
  try {
    loading.value = true
    const [categoriesData, itemsData] = await Promise.all([apiService.getCategories(), apiService.getItems()])
    categories.value = categoriesData
    items.value = itemsData
  } catch (error) {
    console.error('Error loading dashboard data:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
