<template>
  <div class="space-y-2">
    <div
      class="flex flex-wrap items-center gap-1.5 p-2 min-h-[2.5rem] rounded-md border border-slate-300 bg-white dark:bg-slate-700 dark:border-slate-600 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent"
      @click="focusInput"
    >
      <span
        v-for="lid in modelValue"
        :key="lid"
        :class="[
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          chipClass(labelById.get(lid)?.color),
        ]"
      >
        {{ labelById.get(lid)?.name ?? '…' }}
        <button
          type="button"
          class="ml-0.5 -mr-1 text-current opacity-60 hover:opacity-100"
          @click.stop="remove(lid)"
          :aria-label="`Remove label ${labelById.get(lid)?.name ?? ''}`"
        >
          <i class="pi pi-times text-[0.6rem]"></i>
        </button>
      </span>

      <input
        ref="inputEl"
        v-model="query"
        type="text"
        :placeholder="modelValue.length === 0 ? placeholder : ''"
        class="flex-1 min-w-[6rem] bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
        @keydown.enter.prevent="commitQuery"
        @keydown.backspace="onBackspace"
        @keydown.escape="closeMenu"
        @focus="menuOpen = true"
      />
    </div>

    <div
      v-if="menuOpen && (suggestions.length > 0 || canCreate)"
      class="rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm max-h-48 overflow-y-auto"
    >
      <button
        v-for="lab in suggestions"
        :key="lab.id"
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700"
        @click="add(lab.id)"
      >
        <span :class="['inline-block w-2.5 h-2.5 rounded-full', dotClass(lab.color)]"></span>
        <span class="text-slate-900 dark:text-white">{{ lab.name }}</span>
      </button>
      <button
        v-if="canCreate"
        type="button"
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700"
        @click="createAndAdd"
        :disabled="creating"
      >
        <i class="pi pi-plus text-xs"></i>
        <span>Create "{{ trimmedQuery }}"</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { useLiveQuery } from '../composables/useLiveQuery'
import { db } from '../services/db'
import { apiService } from '../services/api'
import type { CachedLabel } from '../types/db'
import { chipClass, dotClass } from '../utils/labelColors'

const props = withDefaults(defineProps<{
  modelValue: string[]
  placeholder?: string
}>(), {
  placeholder: 'Add labels…',
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void
}>()

const query = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const menuOpen = ref(false)
const creating = ref(false)

const labels = useLiveQuery<CachedLabel[]>(() => db.labels.toArray(), [])

const labelById = computed(() => {
  const m = new Map<string, CachedLabel>()
  for (const l of labels.value ?? []) m.set(l.id, l)
  return m
})

const trimmedQuery = computed(() => query.value.trim())

const suggestions = computed(() => {
  const q = trimmedQuery.value.toLowerCase()
  const selected = new Set(props.modelValue)
  const all = labels.value ?? []
  const filtered = q
    ? all.filter((l) => l.name.toLowerCase().includes(q) && !selected.has(l.id))
    : all.filter((l) => !selected.has(l.id))
  return filtered.slice(0, 8)
})

const canCreate = computed(() => {
  const q = trimmedQuery.value
  if (!q) return false
  const exact = (labels.value ?? []).find((l) => l.name.toLowerCase() === q.toLowerCase())
  return !exact
})

function focusInput() {
  inputEl.value?.focus()
}

function add(id: string) {
  if (props.modelValue.includes(id)) return
  emit('update:modelValue', [...props.modelValue, id])
  query.value = ''
}

function remove(id: string) {
  emit('update:modelValue', props.modelValue.filter((x) => x !== id))
}

function onBackspace() {
  if (query.value === '' && props.modelValue.length > 0) {
    remove(props.modelValue[props.modelValue.length - 1])
  }
}

function commitQuery() {
  const q = trimmedQuery.value
  if (!q) return
  const exact = (labels.value ?? []).find((l) => l.name.toLowerCase() === q.toLowerCase())
  if (exact) {
    add(exact.id)
    return
  }
  void createAndAdd()
}

async function createAndAdd() {
  const name = trimmedQuery.value
  if (!name || creating.value) return
  creating.value = true
  try {
    const created = await apiService.createLabel({ name })
    add(created.id)
  } catch (err) {
    toast.error('Failed to create label', {
      description: err instanceof Error ? err.message : 'Unknown error',
    })
  } finally {
    creating.value = false
  }
}

function closeMenu() {
  menuOpen.value = false
}

function onDocClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (!target) return
  const root = (inputEl.value?.closest('.space-y-2') as Node | null) ?? null
  if (root && !root.contains(target)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', onDocClick))
onUnmounted(() => document.removeEventListener('mousedown', onDocClick))

</script>
