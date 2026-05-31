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
 * When an offline create resolves and the server assigns a real id, any
 * queued mutations that referenced the temporary clientId need to be rewritten
 * so they target the server-assigned resource. Walks the outbox and patches
 * url / body / resourceId in-place.
 */
export async function rewriteClientId(
  clientId: string,
  serverId: string,
  resource: OutboxMutation['resource']
): Promise<void> {
  const affected = await db.mutations.where('clientId').equals(clientId).toArray()
  await db.transaction('rw', db.mutations, async () => {
    for (const m of affected) {
      if (m.resource !== resource || m.id === undefined) continue
      const newUrl = m.url.includes(clientId) ? m.url.replace(clientId, serverId) : m.url
      const newBody =
        m.body && typeof m.body === 'object' && m.body !== null
          ? rewriteBodyIds(m.body as Record<string, unknown>, clientId, serverId)
          : m.body
      await db.mutations.update(m.id, {
        url: newUrl,
        body: newBody,
        resourceId: serverId,
        clientId: undefined,
      })
    }
  })
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
