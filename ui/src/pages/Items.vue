<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-white">Items</h1>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage your inventory items</p>
      </div>
      <div class="mt-4 sm:mt-0">
        <Button label="Add Item" icon="pi pi-plus" @click="showCreateDialog" />
      </div>
    </div>

    <div
      class="sticky top-[calc(env(safe-area-inset-top)+3.75rem)] lg:top-0 z-10 flex flex-col gap-4 p-4 bg-white border rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between dark:bg-slate-800 border-slate-200 dark:border-slate-700"
    >
      <div class="flex-1 max-w-md">
        <div class="relative">
          <i
            class="absolute transform -translate-y-1/2 left-3 top-1/2 text-slate-400 dark:text-slate-500 pi pi-search"
          ></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search items..."
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
      <div class="flex items-center gap-4">
        <div class="flex items-center text-sm text-slate-600 dark:text-slate-400">
          <i class="mr-2 pi pi-info-circle"></i>
          <span>{{ filteredItems.length }} of {{ items.length }} items</span>
        </div>
        <div class="flex items-center text-sm text-slate-600 dark:text-slate-400">
          <i class="mr-2 pi pi-chart-line"></i>
          <span>{{ totalStock }} total stock</span>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-24">
      <i class="text-4xl text-indigo-600 pi pi-spinner pi-spin dark:text-indigo-400"></i>
    </div>

    <!-- Mobile Cards (< 768px) -->
    <div v-else>
      <div class="md:hidden flex flex-col min-h-[calc(100vh-12rem)]">
        <PullToRefresh ref="pullToRefreshRef" @refresh="onRefresh" class="flex-1">
          <div v-if="filteredItems.length === 0" class="py-12 text-center">
            <div v-if="items.length === 0 && !searchQuery" class="max-w-sm mx-auto p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                <i class="text-2xl pi pi-box text-emerald-600 dark:text-emerald-400"></i>
              </div>
              <p class="text-lg font-medium text-slate-900 dark:text-white">Add your first item</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Start tracking your inventory by creating an item.</p>
              <Button label="Add Item" icon="pi pi-plus" @click="showCreateDialog" class="mt-4" />
            </div>
            <div v-else>
              <div class="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700">
                <i class="text-2xl pi pi-search text-slate-400 dark:text-slate-500"></i>
              </div>
              <p class="text-lg font-medium text-slate-900 dark:text-white">No items found</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">No results for "{{ searchQuery }}"</p>
              <Button label="Clear search" icon="pi pi-times" @click="clearSearch" text class="mt-4" />
            </div>
          </div>

          <div v-else class="space-y-3">
            <SwipeList
              :items="paginatedItems"
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
                        <Button label="Delete" size="small" severity="danger" :loading="deleting" @click="deleteItem" />
                      </div>
                    </div>
                  </div>

                  <div v-else class="p-4">
                    <div class="flex items-center mb-2">
                      <div class="flex items-center justify-center w-9 h-9 mr-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                        <i class="text-sm text-emerald-600 pi pi-box dark:text-emerald-400"></i>
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3
                          class="font-semibold text-sm text-slate-900 dark:text-white truncate"
                          v-html="highlightSearchTerm(item.name, searchQuery)"
                        ></h3>
                        <p
                          class="text-xs text-slate-500 dark:text-slate-400"
                          v-html="highlightSearchTerm(getCategoryName(item.categoryId), searchQuery)"
                        ></p>
                      </div>
                    </div>

                    <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                      <div class="flex items-center space-x-2">
                        <Button
                          icon="pi pi-minus"
                          severity="secondary"
                          size="small"
                          @click="adjustQuantity(item, -1)"
                          :disabled="item.quantity <= 0"
                          class="!w-8 !h-8 !p-0"
                          :pt="{ root: 'dark:bg-gray-600' }"
                        />
                        <span
                          class="font-semibold text-slate-900 dark:text-white min-w-[2rem] text-center transition-transform duration-300"
                          :class="{ 'scale-125': quantityAnimatingId === item.id }"
                        >
                          {{ item.quantity }}
                        </span>
                        <Button
                          icon="pi pi-plus"
                          severity="secondary"
                          size="small"
                          @click="adjustQuantity(item, 1)"
                          class="!w-8 !h-8 !p-0"
                          :pt="{ root: 'dark:bg-gray-600' }"
                        />
                      </div>

                      <Button
                        icon="pi pi-hashtag"
                        severity="secondary"
                        size="small"
                        @click="showQuantityDialog(item)"
                        class="!w-8 !h-8 !p-0"
                        :pt="{ root: 'dark:bg-gray-600' }"
                        v-tooltip.left="'Manage qty'"
                      />
                    </div>
                  </div>
                </div>
              </template>

              <template #right="{ item, close }">
                <div class="flex h-full">
                  <button
                    @click="close(); editItem(item)"
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
          v-if="filteredItems.length > 0"
          class="sticky bottom-0 z-10 flex items-center justify-between py-3 mt-4 -mx-4 -mb-4 bg-white border-t shadow-[0_-1px_2px_rgba(0,0,0,0.04)] dark:bg-slate-800 border-slate-200 dark:border-slate-700 pl-[max(2.5rem,env(safe-area-inset-left))] pr-[max(2.5rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div class="text-sm text-slate-500 dark:text-slate-400">
            {{ (currentPage - 1) * itemsPerPage + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredItems.length) }} of {{ filteredItems.length }}
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
              :value="filteredItems"
              :loading="loading"
              paginator
              :rows="10"
              :rowsPerPageOptions="[5, 10, 25]"
              tableStyle="min-width: 50rem"
              paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
              currentPageReportTemplate="Showing {first} to {last} of {totalRecords} items"
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
                      class="flex items-center justify-center w-8 h-8 mr-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50"
                    >
                      <i class="text-sm pi pi-box text-emerald-600 dark:text-emerald-400"></i>
                    </div>
                    <div>
                      <span class="font-medium text-slate-900 dark:text-white">{{ data.name }}</span>
                      <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {{ getCategoryName(data.categoryId) }}
                      </div>
                    </div>
                  </div>
                </template>
              </Column>

              <Column field="description" header="Description" class="px-6 py-4">
                <template #body="{ data }">
                  <span class="text-slate-600 dark:text-slate-400">{{ data.description || 'No description' }}</span>
                </template>
              </Column>

              <Column field="quantity" header="Quantity" sortable class="px-6 py-4">
                <template #body="{ data }">
                  <div class="flex items-center space-x-2">
                    <Button
                      icon="pi pi-minus"
                      @click="adjustQuantity(data, -1)"
                      :disabled="data.quantity <= 0"
                      text
                      rounded
                      size="small"
                      severity="secondary"
                      class="!w-6 !h-6"
                    />
                    <span
                      class="font-medium text-slate-900 dark:text-white min-w-[2rem] text-center transition-transform duration-300"
                      :class="{ 'scale-125': quantityAnimatingId === data.id }"
                    >
                      {{ data.quantity }}
                    </span>
                    <Button
                      icon="pi pi-plus"
                      @click="adjustQuantity(data, 1)"
                      text
                      rounded
                      size="small"
                      severity="secondary"
                      class="!w-6 !h-6"
                    />
                  </div>
                </template>
              </Column>

              <Column field="skus" header="SKUs" class="px-6 py-4">
                <template #body="{ data }">
                  <div class="flex items-center text-sm text-slate-600 dark:text-slate-400">
                    <i class="mr-2 text-xs pi pi-tag"></i>
                    <span>{{ data.skus.length > 0 ? data.skus.join(', ') : 'No SKUs' }}</span>
                  </div>
                </template>
              </Column>

              <Column header="Actions" class="px-6 py-4">
                <template #body="{ data }">
                  <div v-if="confirmingDeleteId === data.id" class="flex items-center space-x-2">
                    <span class="text-sm text-red-600 dark:text-red-400 font-medium">Delete?</span>
                    <Button label="Cancel" size="small" text @click="cancelDelete" />
                    <Button label="Confirm" size="small" severity="danger" :loading="deleting" @click="deleteItem" />
                  </div>
                  <div v-else class="flex items-center space-x-2">
                    <Button
                      icon="pi pi-hashtag"
                      @click="showQuantityDialog(data)"
                      severity="secondary"
                      size="small"
                      v-tooltip.top="'Manage quantity'"
                      :pt="{
                        root: 'dark:bg-gray-600',
                      }"
                    />
                    <Button
                      icon="pi pi-pencil"
                      @click="editItem(data)"
                      severity="secondary"
                      size="small"
                      v-tooltip.top="'Edit item'"
                      :pt="{
                        root: 'dark:bg-gray-600',
                      }"
                    />
                    <Button
                      icon="pi pi-trash"
                      @click="confirmDelete(data)"
                      severity="danger"
                      size="small"
                      v-tooltip.top="'Delete item'"
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
      :header="dialogMode === 'create' ? 'Create Item' : 'Edit Item'"
    >
      <form @submit.prevent="saveItem" class="space-y-4 p-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label for="name" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Name *</label>
            <InputText
              id="name"
              v-model="itemForm.name"
              :invalid="!!errors.name"
              placeholder="Enter item name"
              class="w-full"
              :pt="{
                root: 'dark:bg-slate-700',
              }"
            />
            <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
          </div>

          <div>
            <label for="category" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >Category *</label
            >
            <AutoComplete
              id="category"
              v-model="categorySearch"
              :suggestions="filteredCategories"
              optionLabel="name"
              dropdown
              :invalid="!!errors.categoryId"
              placeholder="Type or select a category"
              class="w-full"
              :pt="{
                root: 'dark:bg-slate-700',
                pcInputText: { root: 'dark:bg-slate-700 w-full' },
              }"
              @complete="searchCategories"
              @item-select="onCategorySelect"
            >
              <template #option="{ option }">
                <div v-if="option.id === '__create__'" class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <i class="pi pi-plus text-xs"></i>
                  <span>Create "{{ option.name }}"</span>
                </div>
                <div v-else>{{ option.name }}</div>
              </template>
            </AutoComplete>
            <small v-if="errors.categoryId" class="p-error">{{ errors.categoryId }}</small>
          </div>
        </div>

        <div>
          <label for="description" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >Description</label
          >
          <Textarea
            id="description"
            v-model="itemForm.description"
            rows="3"
            placeholder="Enter item description"
            class="w-full"
            :pt="{
              root: 'dark:bg-slate-700',
            }"
          />
        </div>

        <div>
          <label for="quantity" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
            >Quantity *</label
          >
          <InputNumber
            id="quantity"
            v-model="itemForm.quantity"
            :invalid="!!errors.quantity"
            :min="0"
            placeholder="Enter quantity"
            class="w-full"
            :pt="{
              root: 'dark:bg-slate-700',
              pcInputText: 'dark:bg-slate-700',
            }"
          />
          <small v-if="errors.quantity" class="p-error">{{ errors.quantity }}</small>
        </div>

        <div>
          <label class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">SKUs</label>
          <div class="space-y-2">
            <div v-for="(_, index) in itemForm.skus" :key="index" class="flex items-center space-x-2">
              <InputText
                v-model="itemForm.skus[index]"
                placeholder="Enter SKU"
                class="flex-1"
                :pt="{
                  root: 'dark:bg-slate-700',
                }"
              />
              <Button
                icon="pi pi-trash"
                @click="removeSku(index)"
                text
                rounded
                severity="danger"
                size="small"
                v-tooltip="'Remove SKU'"
              />
            </div>
            <Button label="Add SKU" icon="pi pi-plus" @click="addSku" text size="small" class="mt-2" />
          </div>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end space-x-3 p-4 border-t border-slate-200 dark:border-slate-700">
          <Button label="Cancel" icon="pi pi-times" @click="dialogVisible = false" text />
          <Button
            :label="dialogMode === 'create' ? 'Create' : 'Update'"
            icon="pi pi-check"
            @click="saveItem"
            :loading="saving"
          />
        </div>
      </template>
    </BottomDrawer>


    <BottomDrawer
      v-model="quantityDialogVisible"
      header="Manage Quantity"
      autoHeight
    >
      <div class="p-4 space-y-4">
        <div class="flex items-center space-x-3">
          <div class="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full dark:bg-blue-900/50">
            <i class="text-blue-600 pi pi-hashtag dark:text-blue-400"></i>
          </div>
          <div>
            <p class="text-sm font-medium text-slate-900 dark:text-white">{{ selectedItem?.name }}</p>
            <p class="text-sm text-slate-600 dark:text-slate-400">Current: {{ selectedItem?.quantity }}</p>
          </div>
        </div>

        <form
          @submit.prevent="updateQuantity(selectedItem!, quantityForm.operation, quantityForm.quantity)"
          class="space-y-4"
        >
          <div>
            <label for="quantity-operation" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >Operation</label
            >
            <Dropdown
              id="quantity-operation"
              v-model="quantityForm.operation"
              :options="[
                { label: 'Set', value: 'set' },
                { label: 'Add', value: 'add' },
                { label: 'Subtract', value: 'subtract' },
              ]"
              optionLabel="label"
              optionValue="value"
              placeholder="Select operation"
              class="w-full"
              :pt="{
                root: 'dark:bg-slate-700',
              }"
            />
          </div>

          <div>
            <label for="quantity-amount" class="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >Amount</label
            >
            <InputNumber
              id="quantity-amount"
              v-model="quantityForm.quantity"
              :min="1"
              placeholder="Enter amount"
              class="w-full"
            />
          </div>

          <div class="flex justify-end space-x-3">
            <Button label="Cancel" icon="pi pi-times" @click="quantityDialogVisible = false" text />
            <Button label="Update" icon="pi pi-check" type="submit" :loading="saving" />
          </div>
        </form>
      </div>
    </BottomDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Dropdown from 'primevue/dropdown'
import AutoComplete from 'primevue/autocomplete'
import { SwipeList } from '@ahultgren/vue3-swipe-actions'
import '@ahultgren/vue3-swipe-actions/style.css'
import BottomDrawer from '../components/BottomDrawer.vue'
import PullToRefresh from '../components/PullToRefresh.vue'
import { apiService } from '../services/api'
import type { Item, Category, CreateItemRequest, UpdateItemRequest, UpdateQuantityRequest } from '../types'


const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const items = ref<Item[]>([])
const categories = ref<Category[]>([])
const dialogVisible = ref(false)
const quantityDialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const itemToDelete = ref<Item | null>(null)
const selectedItem = ref<Item | null>(null)

const categorySearch = ref<any>('')
const filteredCategories = ref<any[]>([])
const confirmingDeleteId = ref<string | null>(null)
const pullToRefreshRef = ref<InstanceType<typeof PullToRefresh> | null>(null)
const quantityAnimatingId = ref<string | null>(null)

const currentPage = ref(1)
const itemsPerPage = ref(10)

const searchQuery = ref('')
const filteredItems = computed(() => {
  if (!searchQuery.value) {
    return items.value
  }
  const query = searchQuery.value.toLowerCase()
  return items.value.filter((item) => {
    const matchesName = item.name.toLowerCase().includes(query)
    const matchesDescription = item.description ? item.description.toLowerCase().includes(query) : false
    const matchesSkus = item.skus.some((sku) => sku.toLowerCase().includes(query))
    const matchesCategory = getCategoryName(item.categoryId).toLowerCase().includes(query)
    return matchesName || matchesDescription || matchesSkus || matchesCategory
  })
})

const totalStock = computed(() => {
  return filteredItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

watch(searchQuery, () => {
  currentPage.value = 1
})

const itemForm = reactive({
  name: '',
  description: '',
  categoryId: '',
  quantity: 0,
  skus: [''],
})

const quantityForm = reactive({
  operation: 'set' as 'set' | 'add' | 'subtract',
  quantity: 0,
})

const errors = reactive({
  name: '',
  categoryId: '',
  quantity: '',
})

const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage.value))
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredItems.value.slice(start, end)
})

const getCategoryName = (categoryId: string) => {
  const category = categories.value.find((c) => c.id === categoryId)
  return category ? category.name : 'Unknown'
}

const loadData = async (options: { silent?: boolean } = {}) => {
  try {
    if (!options.silent) loading.value = true
    const [itemsData, categoriesData] = await Promise.all([apiService.getItems(), apiService.getCategories()])
    items.value = itemsData
    categories.value = categoriesData
  } catch (error) {
    console.error('Error loading data:', error)
    toast.error('Failed to load data')
  } finally {
    if (!options.silent) loading.value = false
  }
}

const showCreateDialog = () => {
  dialogMode.value = 'create'
  itemForm.name = ''
  itemForm.description = ''
  itemForm.categoryId = ''
  itemForm.quantity = 0
  itemForm.skus = ['']
  categorySearch.value = ''
  clearErrors()
  dialogVisible.value = true
}

const editItem = (item: Item) => {
  dialogMode.value = 'edit'
  selectedItem.value = item
  itemForm.name = item.name
  itemForm.description = item.description || ''
  itemForm.categoryId = item.categoryId
  itemForm.quantity = item.quantity
  itemForm.skus = item.skus.length > 0 ? [...item.skus] : ['']
  categorySearch.value = categories.value.find(c => c.id === item.categoryId) || ''
  clearErrors()
  dialogVisible.value = true
}

const clearErrors = () => {
  errors.name = ''
  errors.categoryId = ''
  errors.quantity = ''
}

const validateForm = () => {
  clearErrors()
  let isValid = true

  if (!itemForm.name.trim()) {
    errors.name = 'Name is required'
    isValid = false
  }

  if (!itemForm.categoryId) {
    errors.categoryId = 'Category is required'
    isValid = false
  }

  if (itemForm.quantity < 0) {
    errors.quantity = 'Quantity must be non-negative'
    isValid = false
  }

  return isValid
}

const addSku = () => {
  itemForm.skus.push('')
}

const removeSku = (index: number) => {
  itemForm.skus.splice(index, 1)
  if (itemForm.skus.length === 0) {
    itemForm.skus.push('')
  }
}

const saveItem = async () => {
  if (!validateForm()) return

  try {
    saving.value = true

    const filteredSkus = itemForm.skus.filter((sku) => sku.trim() !== '')

    if (dialogMode.value === 'create') {
      const data: CreateItemRequest = {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        categoryId: itemForm.categoryId,
        quantity: itemForm.quantity,
        skus: filteredSkus,
      }

      await apiService.createItem(data)
      toast.success('Item created successfully')
    } else {
      const data: UpdateItemRequest = {
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || undefined,
        categoryId: itemForm.categoryId,
        quantity: itemForm.quantity,
        skus: filteredSkus,
      }

      await apiService.updateItem(selectedItem.value!.id, data)
      toast.success('Item updated successfully')
    }

    dialogVisible.value = false
    await loadData({ silent: true })
  } catch (error) {
    console.error('Error saving item:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to save item')
  } finally {
    saving.value = false
  }
}

const adjustQuantity = async (item: Item, change: number) => {
  try {
    const newQuantity = Math.max(0, item.quantity + change)
    const request: UpdateQuantityRequest = {
      operation: 'set',
      quantity: newQuantity,
    }

    await apiService.updateItemQuantity(item.id, request)
    item.quantity = newQuantity

    quantityAnimatingId.value = item.id
    setTimeout(() => {
      quantityAnimatingId.value = null
    }, 300)

    toast.success('Quantity updated successfully')
  } catch (error) {
    console.error('Error updating quantity:', error)
    toast.error('Failed to update quantity')
  }
}

const updateQuantity = async (item: Item, operation: 'set' | 'add' | 'subtract', amount: number) => {
  try {
    const data: UpdateQuantityRequest = {
      operation,
      quantity: amount,
    }

    await apiService.updateItemQuantity(item.id, data)

    const index = items.value.findIndex((i) => i.id === item.id)
    if (index !== -1) {
      switch (operation) {
        case 'set':
          items.value[index].quantity = amount
          break
        case 'add':
          items.value[index].quantity += amount
          break
        case 'subtract':
          items.value[index].quantity = Math.max(0, items.value[index].quantity - amount)
          break
      }
    }

    toast.success('Quantity updated successfully')
  } catch (error) {
    console.error('Error updating quantity:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to update quantity')
  }
}

const deleteItem = async () => {
  if (!itemToDelete.value) return

  try {
    deleting.value = true
    await apiService.deleteItem(itemToDelete.value.id)

    toast.success('Item deleted successfully')

    confirmingDeleteId.value = null
    itemToDelete.value = null
    await loadData({ silent: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    toast.error(error instanceof Error ? error.message : 'Failed to delete item')
  } finally {
    deleting.value = false
  }
}

const showQuantityDialog = (item: Item) => {
  selectedItem.value = item
  quantityDialogVisible.value = true
}

const clearSearch = () => {
  searchQuery.value = ''
}

const searchCategories = (event: any) => {
  const query = event.query.toLowerCase()
  const matches = categories.value.filter(c =>
    c.name.toLowerCase().includes(query)
  )
  const exactMatch = categories.value.some(c =>
    c.name.toLowerCase() === query
  )
  if (query && !exactMatch) {
    matches.push({ id: '__create__', name: event.query } as any)
  }
  filteredCategories.value = matches
}

const onCategorySelect = async (event: any) => {
  const selected = event.value
  if (selected.id === '__create__') {
    try {
      const newCategory = await apiService.createCategory({ name: selected.name })
      categories.value.push(newCategory)
      itemForm.categoryId = newCategory.id
      categorySearch.value = newCategory
      toast.success(`"${newCategory.name}" created`)
    } catch (error) {
      toast.error('Failed to create category')
      categorySearch.value = ''
    }
  } else {
    itemForm.categoryId = selected.id
  }
}

const confirmDelete = (item: Item) => {
  confirmingDeleteId.value = item.id
  itemToDelete.value = item
}

const cancelDelete = () => {
  confirmingDeleteId.value = null
  itemToDelete.value = null
}

const onRefresh = async () => {
  await loadData({ silent: true })
  pullToRefreshRef.value?.done()
}

const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm || !text) return text
  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark class="px-1 bg-yellow-200 rounded dark:bg-yellow-800">$1</mark>')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.swipe-list :deep(.swipeout-list-item) {
  margin-bottom: 0.75rem;
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

<style>
.p-datatable-header-cell {
  @apply dark:bg-slate-700/50 dark:text-slate-200;
}

.p-paginator {
  @apply dark:bg-slate-800 dark:border-slate-600;
}

.p-row-even,
.p-row-odd {
  background: transparent !important;
}

.p-inputtext {
  @apply dark:bg-slate-700;
}
</style>
