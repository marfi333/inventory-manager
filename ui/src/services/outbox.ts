import type { OutboxMutation } from '../types/db'
import { db } from './db'

export type EnqueueInput = Omit<OutboxMutation, 'id' | 'status' | 'attempts' | 'createdAt'>

export async function enqueue(mutation: EnqueueInput): Promise<number> {
  const id = await db.mutations.add({
    ...mutation,
    status: 'pending',
    attempts: 0,
    createdAt: Date.now(),
  })
  return id as number
}

export async function peekPending(): Promise<OutboxMutation[]> {
  return db.mutations
    .where('status')
    .anyOf('pending', 'failed')
    .sortBy('createdAt')
}

export async function dequeueAll(): Promise<OutboxMutation[]> {
  return db.mutations.orderBy('createdAt').toArray()
}

export async function markInFlight(id: number): Promise<void> {
  await db.mutations.update(id, {
    status: 'in_flight',
    attempts: (await db.mutations.get(id))?.attempts ?? 0,
  })
}

export async function markSynced(id: number): Promise<void> {
  await db.mutations.delete(id)
}

export async function markFailed(id: number, error: string): Promise<void> {
  const current = await db.mutations.get(id)
  await db.mutations.update(id, {
    status: 'failed',
    attempts: (current?.attempts ?? 0) + 1,
    error,
  })
}

export async function retry(id: number): Promise<void> {
  await db.mutations.update(id, {
    status: 'pending',
    error: undefined,
  })
}

export async function countPending(): Promise<number> {
  return db.mutations.where('status').anyOf('pending', 'in_flight', 'failed').count()
}

/**
 * Find failed mutations targeting a given resource. Matches both the
 * server-assigned `resourceId` and the offline-create `clientId`, since the
 * page-layer cache row's `id` field can hold either depending on whether the
 * create has reconciled yet.
 */
export async function findFailedForResource(
  resource: OutboxMutation['resource'],
  resourceOrClientId: string,
): Promise<OutboxMutation[]> {
  const all = await db.mutations
    .where('status')
    .equals('failed')
    .toArray()
  return all.filter(
    (m) =>
      m.resource === resource &&
      (m.resourceId === resourceOrClientId || m.clientId === resourceOrClientId),
  )
}

/**
 * When an offline create resolves and the server assigns a real id, every
 * queued mutation that references the temporary clientId — anywhere in url,
 * body, or its own resourceId/clientId — needs to be rewritten. We walk the
 * full outbox (not just same-resource entries), because an offline-created
 * category's id can show up in an offline-created item's body.categoryId
 * even though that item mutation has its own distinct clientId.
 */
export async function rewriteClientId(
  clientId: string,
  serverId: string,
  resource: OutboxMutation['resource']
): Promise<void> {
  const all = await db.mutations.toArray()
  await db.transaction('rw', db.mutations, async () => {
    for (const m of all) {
      if (m.id === undefined) continue
      const ownsClientId = m.resource === resource && m.clientId === clientId
      const urlMentions = m.url.includes(clientId)
      const bodyMentions =
        m.body && typeof m.body === 'object' && m.body !== null
          ? bodyContainsId(m.body as Record<string, unknown>, clientId)
          : false
      if (!ownsClientId && !urlMentions && !bodyMentions) continue

      const newUrl = urlMentions
        ? m.url.split(clientId).join(serverId)
        : m.url
      const newBody =
        m.body && typeof m.body === 'object' && m.body !== null
          ? rewriteBodyIds(m.body as Record<string, unknown>, clientId, serverId)
          : m.body
      const patch: Partial<OutboxMutation> = { url: newUrl, body: newBody }
      if (ownsClientId) {
        patch.resourceId = serverId
        patch.clientId = undefined
      }
      await db.mutations.update(m.id, patch)
    }
  })
}

function bodyContainsId(body: Record<string, unknown>, id: string): boolean {
  for (const v of Object.values(body)) {
    if (v === id) return true
  }
  return false
}

function rewriteBodyIds(
  body: Record<string, unknown>,
  clientId: string,
  serverId: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body }
  for (const key of Object.keys(out)) {
    if (out[key] === clientId) out[key] = serverId
  }
  return out
}

/**
 * Permanently drop a failed (or any) mutation from the outbox. Used when a
 * mutation will never succeed (e.g. an offline create against a category that
 * was itself discarded) and the user wants to clear it from the queue.
 */
export async function discard(id: number): Promise<void> {
  await db.mutations.delete(id)
}
