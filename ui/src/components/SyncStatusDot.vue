<template>
  <span
    v-if="status === 'pending' || status === 'failed'"
    @click.stop="onClick"
    :class="[
      'inline-block w-2 h-2 rounded-full flex-shrink-0',
      status === 'failed'
        ? 'bg-red-500 cursor-pointer'
        : 'bg-amber-500 animate-pulse',
    ]"
    :title="title"
    role="status"
    :aria-label="title"
  ></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import type { MutationResource, SyncStatus } from '../types/db'
import { findFailedForResource } from '../services/outbox'
import { retryMutation } from '../composables/useSyncQueue'

const props = defineProps<{
  status: SyncStatus | undefined
  resource: MutationResource
  resourceId: string
}>()

const title = computed(() =>
  props.status === 'failed'
    ? 'Sync failed — tap to retry'
    : 'Pending sync',
)

async function onClick() {
  if (props.status !== 'failed') return
  const failed = await findFailedForResource(props.resource, props.resourceId)
  if (failed.length === 0) {
    toast.error('No failed sync found for this row')
    return
  }
  for (const m of failed) {
    if (m.id !== undefined) await retryMutation(m.id)
  }
  toast.success(`Retrying ${failed.length} change${failed.length === 1 ? '' : 's'}`)
}
</script>
