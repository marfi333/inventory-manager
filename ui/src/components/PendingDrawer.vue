<template>
  <BottomDrawer v-model="model" header="Pending changes">
    <div v-if="!mutations || mutations.length === 0" class="py-8 text-sm text-center text-slate-500 dark:text-slate-400">
      No pending changes — everything is in sync.
    </div>

    <ul v-else class="divide-y divide-slate-200 dark:divide-slate-700">
      <li
        v-for="m in mutations"
        :key="m.id"
        class="flex items-start gap-3 py-3"
      >
        <span
          :class="[
            'mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0',
            m.status === 'failed'
              ? 'bg-red-500'
              : m.status === 'in_flight'
                ? 'bg-indigo-500 animate-pulse'
                : 'bg-amber-500',
          ]"
        ></span>

        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2">
            <p class="text-sm font-medium text-slate-900 dark:text-slate-100">
              {{ describe(m) }}
            </p>
            <span class="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
              {{ relativeTime(m.createdAt) }}
            </span>
          </div>
          <p
            v-if="m.error"
            class="mt-0.5 text-xs text-red-600 dark:text-red-400 truncate"
            :title="m.error"
          >
            {{ m.error }}
          </p>
          <p v-else-if="m.status === 'in_flight'" class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Sending…
          </p>
        </div>

        <div
          v-if="m.status === 'failed' && m.id !== undefined"
          class="flex items-center gap-2 flex-shrink-0"
        >
          <Button
            @click="onRetry(m.id)"
            size="small"
            severity="secondary"
            outlined
          >
            Retry
          </Button>
          <Button
            @click="onDiscard(m)"
            size="small"
            severity="danger"
            outlined
            v-tooltip.left="'Discard this change'"
          >
            Discard
          </Button>
        </div>
      </li>
    </ul>
  </BottomDrawer>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
import BottomDrawer from './BottomDrawer.vue'
import { db } from '../services/db'
import type { OutboxMutation } from '../types/db'
import { useLiveQuery } from '../composables/useLiveQuery'
import { discardMutation, retryMutation } from '../composables/useSyncQueue'

const model = defineModel<boolean>({ required: true })

const mutations = useLiveQuery<OutboxMutation[]>(() =>
  db.mutations
    .where('status')
    .anyOf('pending', 'in_flight', 'failed')
    .sortBy('createdAt'),
)

function describe(m: OutboxMutation): string {
  const verb =
    m.method === 'POST' ? 'Create' : m.method === 'DELETE' ? 'Delete' : 'Update'
  const noun = m.resource === 'item' ? 'item' : 'category'
  return `${verb} ${noun}`
}

function relativeTime(ts: number): string {
  const now = Date.now()
  const diff = Math.max(0, now - ts)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

async function onRetry(id: number) {
  await retryMutation(id)
}

async function onDiscard(m: OutboxMutation) {
  if (m.id === undefined) return
  await discardMutation(m)
}
</script>
