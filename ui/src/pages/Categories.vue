<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Categories</h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your inventory categories</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <Button label="Add Category" icon="pi pi-plus" @click="showCreateDialog" />
      </div>
    </div>

    <div
      ref="searchBar"
      class="search-bar sticky top-[calc(env(safe-area-inset-top)+3.75rem)] lg:top-0 z-10 flex flex-col gap-4 p-4 bg-white border rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800 border-slate-200 dark:border-slate-700"
    >
      <div class="flex-1 max-w-md">
        <div class="relative">
          <i
            class="absolute transform -translate-y-1/2 left-3 top-1/2 text-slate-400 dark:text-slate-500 pi pi-search"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search categories..."
            class="w-full py-2 pl-10 pr-4 text-sm bg-white border rounded-md border-slate-200 dark:border-slate-600 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            @keydown.escape="clearSearch"
          />
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute transform -translate-y-1/2 right-3 top-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          >
            <i class="text-sm pi pi-times"></i>
          </button>
        </div>
      </div>
      <div class="flex items-center text-sm text-slate-600 dark:text-slate-400">
        <i class="mr-2 pi pi-info-circle"></i>
        <span>{{ filteredCategories.length }} of {{ categories.length }} categories</span>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-24">
      <i class="text-4xl text-indigo-600 pi pi-spinner pi-spin dark:text-indigo-400"></i>
    </div>

    <!-- Mobile Cards (< 768px) -->
    <div v-else>
      <div class="md:hidden flex flex-col min-h-[calc(100vh-12rem)]">
        <PullToRefresh ref="pullToRefreshRef" @refresh="onRefresh" class="flex-1">
          <div v-if="filteredCategories.length === 0" class="py-12 text-center">
            <div v-if="categories.length === 0 && !searchQuery" class="max-w-sm mx-auto p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                <i class="text-2xl pi pi-folder text-indigo-600 dark:text-indigo-400"></i>
              </div>
              <p class="text-lg font-medium text-slate-900 dark:text-white">Add your first category</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Organize your inventory by creating a category.</p>
              <Button label="Add Category" icon="pi pi-plus" @click="showCreateDialog" class="mt-4" />
            </div>
            <div v-else>
              <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700">
                <i class="text-2xl pi pi-search text-slate-400 dark:text-slate-500"></i>
              </div>
              <p class="text-lg font-medium text-slate-900 dark:text-white">No categories found</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {{ searchQuery ? `No results for "${searchQuery}"` : 'No categories available' }}
              </p>
              <Button v-if="searchQuery" label="Clear search" icon="pi pi-times" @click="clearSearch" text class="mt-4" />
            </div>
          </div>

          <div v-else class="space-y-3">
            <SwipeList
              :items="paginatedCategories"
              item-key="id"
              class="swipe-list"
            >
              <template #default="{ item, revealed }">
                <div
                  class="bg-white border rounded-lg shadow-sm dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  :class="{ '!rounded-r-none': revealed.value === 'right' }"
                >
                  <div v-if="confirmingDeleteId === item.id" class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-red-700 dark:text-red-300">
                        Delete "{{ item.name }}"?
                      </span>
                      <div class="flex items-center space-x-2">
                        <Button label="Cancel" size="small" text @click="cancelDelete" />
                        <Button label="Delete" size="small" severity="danger" :loading="deleting" @click="deleteCategory" />
                      </div>
                    </div>
                  </div>

                  <div v-else class="p-4">
                    <div class="flex items-start justify-between mb-3">
                      <div class="flex items-center">
                        <div
                          class="flex items-center justify-center w-10 h-10 mr-3 bg-indigo-100 rounded-lg dark:bg-indigo-900/50"
                        >
                          <i class="text-indigo-600 pi pi-folder dark:text-indigo-400"></i>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <h3
                              class="font-semibold text-slate-900 dark:text-white"
                              v-html="highlightSearchTerm(item.name, searchQuery)"
                            ></h3>
                            <SyncStatusDot
                              :status="syncStatusMap.get(item.id)"
                              resource="category"
                              :resource-id="item.id"
                            />
                          </div>
                          <p class="text-sm text-slate-500 dark:text-slate-400">
                            {{ new Date(item.createdAt).toLocaleDateString() }}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div class="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700">
                      <p
                        class="text-sm text-slate-600 dark:text-slate-400"
                        v-html="highlightSearchTerm(item.description || 'No description', searchQuery)"
                      ></p>
                    </div>
                  </div>
                </div>
              </template>

              <template #right="{ item, close }">
                <div class="flex h-full">
                  <button
                    @click="close(); editCategory(item)"
                    class="flex items-center justify-center w-16 bg-blue-500 text-white"
                  >
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button
                    @click="close(); confirmDelete(item)"
                    class="flex items-center justify-center w-16 bg-red-500 text-white"
                  >
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </template>
            </SwipeList>
          </div>

        </PullToRefresh>

        <div
          v-if="filteredCategories.length > 0"
          class="sticky bottom-0 z-10 flex items-center justify-between py-3 mt-4 -mx-4 -mb-4 bg-white border-t shadow-[0_-1px_2px_rgba(0,0,0,0.04)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 pl-[max(2.5rem,env(safe-area-inset-left))] pr-[max(2.5rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div class="text-sm text-slate-500 dark:text-slate-400">
            {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredCategories.length) }} of {{ filteredCategories.length }}
          </div>
          <div class="flex items-center space-x-2">
            <Button
              icon="pi pi-chevron-left"
              severity="secondary"
              size="small"
              :disabled="currentPage === 1"
              @click="currentPage--"
              class="!w-8 !h-8 !p-0"
            />
            <span class="text-sm font-medium text-slate-900 dark:text-white">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <Button
              icon="pi pi-chevron-right"
              severity="secondary"
              size="small"
              :disabled="currentPage === totalPages"
              @click="currentPage++"
              class="!w-8 !h-8 !p-0"
            />
          </div>
        </div>
      </div>

      <!-- Desktop Table (>= 768px) -->
      <div class="hidden md:block">
        <div
          class="overflow-hidden transition-colors duration-200 bg-white border rounded-lg shadow-sm dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        >
          <div class="overflow-x-auto">
            <DataTable
              :value="filteredCategories"
              :loading="loading"
              paginator
              :rows="10"
              :rowsPerPageOptions="[5, 10, 25]"
              tableStyle="min-width: 50rem"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} categories"
              :globalFilterFields="['name', 'description']"
              responsiveLayout="scroll"
              :pageLinkSize="5"
              :alwaysShowPaginator="false"
              :rowHover="true"
              class="w-full custom-datatable"
            >
              <template #loading>
                <div class="flex items-center justify-center py-12">
                  <i class="text-2xl text-indigo-600 pi pi-spinner pi-spin dark:text-indigo-400"></i>
                </div>
              </template>

              <Column field="name" header="Name" sortable class="px-6 py-4">
                <template #body="{ data }">
                  <div class="flex items-center">
                    <div
                      class="flex items-center justify-center w-8 h-8 mr-3 bg-indigo-100 rounded-full dark:bg-indigo-900/50"
                    >
                      <i class="text-sm text-indigo-600 pi pi-folder dark:text-indigo-400"></i>
                    </div>
                    <span class="font-medium text-slate-900 dark:text-white">{{ data.name }}</span>
                    <SyncStatusDot
                      class="ml-2"
                      :status="syncStatusMap.get(data.id)"
                      resource="category"
                      :resource-id="data.id"
                    />
                  </div>
                </template>
              </Column>

              <Column field="description" header="Description" class="px-6 py-4">
                <template #body="{ data }">
                  <span class="text-slate-600 dark:text-slate-400">{{ data.description || 'No description' }}</span>
                </template>
              </Column>

              <Column field="createdAt" header="Created" sortable class="px-6 py-4">
                <template #body="{ data }">
                  <span class="text-sm text-slate-500 dark:text-slate-400">
                    {{ new Date(data.createdAt).toLocaleDateString() }}
                  </span>
                </template>
              </Column>

              <Column header="Actions" class="px-6 py-4">
                <template #body="{ data }">
                  <div v-if="confirmingDeleteId === data.id" class="flex items-center space-x-2">
                    <span class="text-sm text-red-600 dark:text-red-400">Delete?</span>
                    <Button label="Yes" size="small" severity="danger" :loading="deleting" @click="deleteCategory" />
                    <Button label="No" size="small" text @click="cancelDelete" />
                  </div>
                  <div v-else class="flex items-center space-x-2">
                    <Button
                      icon="pi pi-pencil"
                      severity="secondary"
                      size="small"
                      @click="editCategory(data)"
                      v-tooltip.top="'Edit category'"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      size="small"
                      @click="confirmDelete(data)"
                      v-tooltip.top="'Delete category'"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
      </div>
    </div>

    <BottomDrawer
      v-model="dialogVisible"
      :header="dialogMode === 'create' ? 'Create Category' : 'Edit Category'"
      autoHeight
    >
      <form @submit.prevent="saveCategory" class="space-y-4">
        <div>
          <label for="name" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
          <InputText
            id="name"
            v-model="categoryForm.name"
            :invalid="!!errors.name"
            placeholder="Enter category name"
            class="w-full"
            :pt="{
              root: 'dark:bg-slate-700',
            }"
          />
          <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
        </div>

        <div>
          <label for="description" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >Description</label
          >
          <Textarea
            id="description"
            v-model="categoryForm.description"
            rows="3"
            placeholder="Enter category description"
            class="w-full"
            :pt="{
              root: 'dark:bg-slate-700',
            }"
          />
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <Button label="Cancel" icon="pi pi-times" @click="dialogVisible = false" text />
          <Button
            :label="dialogMode === 'create' ? 'Create' : 'Update'"
            icon="pi pi-check"
            @click="saveCategory"
            :loading="saving"
          />
        </div>
      </template>
    </BottomDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, reactive, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { SwipeList } from '@ahultgren/vue3-swipe-actions'
import '@ahultgren/vue3-swipe-actions/style.css'
import BottomDrawer from '../components/BottomDrawer.vue'
import PullToRefresh from '../components/PullToRefresh.vue'
import SyncStatusDot from '../components/SyncStatusDot.vue'
import { useCategorySyncStatus } from '../composables/useSyncStatusMap'
import { apiService } from '../services/api'
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../types'


const syncStatusMap = useCategorySyncStatus()

const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const categories = ref<Category[]>([])
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const selectedCategory = ref<Category | null>(null)
const confirmingDeleteId = ref<string | null>(null)
const pullToRefreshRef = ref<InstanceType<typeof PullToRefresh>>()

const currentPage = ref(1)
const itemsPerPage = ref(10)

const categoryForm = reactive({
  name: '',
  description: '',
})

const errors = reactive({
  name: '',
})

const totalPages = computed(() => Math.ceil(filteredCategories.value.length / itemsPerPage.value))
const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCategories.value.slice(start, end)
})

const searchQuery = ref('')
const searchBar = ref<HTMLElement | null>(null)
let onSearchScroll: (() => void) | null = null

const filteredCategories = computed(() => {
  if (!searchQuery.value) {
    return categories.value
  }
  const query = searchQuery.value.toLowerCase()
  return categories.value.filter(
    (category) => category.name.toLowerCase().includes(query) || category.description?.toLowerCase().includes(query)
  )
})

watch(searchQuery, () => {
  currentPage.value = 1
})

const loadCategories = async (options: { silent?: boolean } = {}) => {
  try {
    if (!options.silent) loading.value = true
    categories.value = await apiService.getCategories()
  } catch (error) {
    console.error('Error loading categories:', error)
    toast.error('Failed to load categories')
  } finally {
    if (!options.silent) loading.value = false
  }
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  categoryForm.name = ''
  categoryForm.description = ''
  errors.name = ''
  dialogVisible.value = true
}

const editCategory = (category: Category) => {
  dialogMode.value = 'edit'
  selectedCategory.value = category
  categoryForm.name = category.name
  categoryForm.description = category.description || ''
  errors.name = ''
  dialogVisible.value = true
}

const validateForm = () => {
  errors.name = ''

  if (!categoryForm.name.trim()) {
    errors.name = 'Name is required'
    return false
  }

  if (categoryForm.name.length > 100) {
    errors.name = 'Name must be less than 100 characters'
    return false
  }

  return true
}

const saveCategory = async () => {
  if (!validateForm()) return

  try {
    saving.value = true

    if (dialogMode.value === 'create') {
      const data: CreateCategoryRequest = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      }

      await apiService.createCategory(data)
      toast.success('Category created successfully')
    } else {
      const data: UpdateCategoryRequest = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
      }

      await apiService.updateCategory(selectedCategory.value!.id, data)
      toast.success('Category updated successfully')
    }

    dialogVisible.value = false
    await loadCategories({ silent: true })
  } catch (error) {
    console.error('Error saving category:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to save category')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (category: Category) => {
  confirmingDeleteId.value = category.id
}

const cancelDelete = () => {
  confirmingDeleteId.value = null
}

const deleteCategory = async () => {
  if (!confirmingDeleteId.value) return

  try {
    deleting.value = true
    await apiService.deleteCategory(confirmingDeleteId.value)

    toast.success('Category deleted successfully')

    confirmingDeleteId.value = null
    await loadCategories({ silent: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to delete category')
  } finally {
    deleting.value = false
  }
}

const onRefresh = async () => {
  await loadCategories({ silent: true })
  pullToRefreshRef.value?.done()
}

const clearSearch = () => {
  searchQuery.value = ''
}

const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm || !text) return text
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark class="px-1 bg-yellow-200 rounded dark:bg-yellow-800">$1</mark>')
}

onMounted(() => {
  loadCategories()
  if (searchBar.value) {
    const bar = searchBar.value
    onSearchScroll = () => {
      const topPx = parseFloat(getComputedStyle(bar).top) || 0
      const stuck = bar.getBoundingClientRect().top <= topPx + 0.5
      bar.toggleAttribute('data-stuck', stuck)
    }
    window.addEventListener('scroll', onSearchScroll, { passive: true })
    onSearchScroll()
  }
})

onBeforeUnmount(() => {
  if (onSearchScroll) {
    window.removeEventListener('scroll', onSearchScroll)
    onSearchScroll = null
  }
})
</script>

<style scoped>
@media (max-width: 1023px) {
  .search-bar {
    transition: margin 180ms ease-out, border-radius 180ms ease-out, border-color 180ms ease-out;
  }
  .search-bar[data-stuck] {
    margin-left: -1rem;
    margin-right: -1rem;
    border-radius: 0;
    border-color: transparent;
  }
}

.swipe-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.swipe-list :deep(.swipeout-list-item) {
  border-radius: 0.5rem;
  overflow: hidden;
}

.swipe-list :deep(.swipeout-action) {
  display: flex;
  align-items: stretch;
}

.custom-datatable :deep(.p-datatable) {
  border-radius: 8px;
  overflow: hidden;
}

.custom-datatable :deep(.p-datatable-header) {
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 16px;
}

.custom-datatable :deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid #f1f5f9;
}

.custom-datatable :deep(.p-datatable-tbody > tr:hover) {
  background-color: #f8fafc;
}

.custom-datatable :deep(.p-datatable-tbody > tr > td) {
  padding: 16px;
  vertical-align: middle;
}

.custom-datatable :deep(.p-paginator) {
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 16px;
}

.dark .custom-datatable :deep(.p-datatable-header) {
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}

.dark .custom-datatable :deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid #334155;
}

.dark .custom-datatable :deep(.p-datatable-tbody > tr:hover) {
  background-color: #1e293b;
}

.dark .custom-datatable :deep(.p-paginator) {
  background-color: #1e293b;
  border-top: 1px solid #334155;
}
</style>
