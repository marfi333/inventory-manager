<template>
  <button
    type="button"
    @click="onClick"
    :class="[
      'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors',
      isOnline
        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
        : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60',
    ]"
    :aria-label="ariaLabel"
  >
    <i :class="['pi !text-[0.75rem] !leading-none', isOnline ? 'pi-check-circle' : 'pi-exclamation-triangle']"></i>
    <span>{{ isOnline ? 'Online' : 'Offline' }}</span>
    <span
      v-if="pendingCount > 0"
      :class="[
        'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[0.65rem] font-semibold rounded-full',
        hasFailed ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white',
      ]"
    >
      {{ pendingCount }}
    </span>
  </button>

  <PendingDrawer v-model="drawerOpen" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { db } from '../services/db'
import type { OutboxMutation } from '../types/db'
import { useLiveQuery } from '../composables/useLiveQuery'
import { useNetworkStatus } from '../composables/useNetworkStatus'
import PendingDrawer from './PendingDrawer.vue'

const { isOnline } = useNetworkStatus()

const drawerOpen = defineModel<boolean>('open', { default: false })

const pendingMutations = useLiveQuery<OutboxMutation[]>(() =>
  db.mutations.where('status').anyOf('pending', 'in_flight', 'failed').toArray(),
)

const pendingCount = computed(() => pendingMutations.value?.length ?? 0)
const hasFailed = computed(() => (pendingMutations.value ?? []).some((m) => m.status === 'failed'))

const ariaLabel = computed(() => {
  const status = isOnline.value ? 'online' : 'offline'
  if (pendingCount.value === 0) return `Status: ${status}`
  return `Status: ${status}, ${pendingCount.value} pending change${pendingCount.value === 1 ? '' : 's'}`
})

function onClick() {
  drawerOpen.value = true
}
</script>
