/**
 * Offline write outbox. Queues mutations when the network/backend is unavailable
 * and flushes on reconnect.
 */

import { syncStorage } from '@/lib/storage';

const OUTBOX_KEY = 'chakraos:outbox:v1';

export type OutboxOp =
  | { id: string; type: 'checkin'; payload: Record<string, unknown>; createdAt: number }
  | { id: string; type: 'journal'; payload: Record<string, unknown>; createdAt: number }
  | { id: string; type: 'frequency_session'; payload: Record<string, unknown>; createdAt: number }
  | { id: string; type: 'analytics'; payload: Record<string, unknown>; createdAt: number };

async function readOutbox(): Promise<OutboxOp[]> {
  const raw = await syncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OutboxOp[];
  } catch {
    return [];
  }
}

async function writeOutbox(ops: OutboxOp[]): Promise<void> {
  await syncStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
}

export async function enqueueOutbox(op: Omit<OutboxOp, 'id' | 'createdAt'> & { id?: string }) {
  const ops = await readOutbox();
  ops.push({
    ...op,
    id: op.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  } as OutboxOp);
  await writeOutbox(ops);
}

export async function peekOutbox(): Promise<OutboxOp[]> {
  return readOutbox();
}

export async function removeOutboxOp(id: string): Promise<void> {
  const ops = await readOutbox();
  await writeOutbox(ops.filter((o) => o.id !== id));
}

export async function clearOutbox(): Promise<void> {
  await syncStorage.removeItem(OUTBOX_KEY);
}
