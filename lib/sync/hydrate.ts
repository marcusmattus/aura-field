/**
 * Hydrate cloud journals + chakra scores into the Zustand cache,
 * and flush the offline outbox when online.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  createJournalEntry,
  fetchLatestChakraScores,
  listJournalEntries,
  recordFrequencySession,
  trackAnalytics,
  upsertDailyCheckIn,
  type DailyCheckInInput,
} from '@/lib/db';
import { hasBackend } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';
import { peekOutbox, removeOutboxOp } from '@/lib/sync/outbox';
import type { ChakraKey, EntryTag, JournalEntry, Modality } from '@/lib/types';

function rowToEntry(row: {
  id: string;
  body: string;
  modality: string;
  themes: string[];
  tags: unknown;
  seeded_chakra: string | null;
  voice_storage_path: string | null;
  voice_duration_s: number | null;
  created_at: string;
}): JournalEntry {
  return {
    id: row.id,
    body: row.body,
    modality: (row.modality as Modality) ?? 'text',
    createdAt: new Date(row.created_at).getTime(),
    themes: row.themes ?? [],
    tags: (row.tags as EntryTag[]) ?? [],
    seededChakra: (row.seeded_chakra as ChakraKey | null) ?? undefined,
    voiceUrl: row.voice_storage_path ?? undefined,
    voiceDurationS: row.voice_duration_s ?? undefined,
  };
}

export function useCloudHydration(enabled: boolean) {
  const syncEntriesFromCloud = useChakraStore((s) => s.syncEntriesFromCloud);
  const applyCloudScores = useChakraStore((s) => s.applyCloudScores);

  const journals = useQuery({
    queryKey: ['journals'],
    enabled: enabled && hasBackend,
    queryFn: () => listJournalEntries(50),
    staleTime: 30_000,
  });

  const scores = useQuery({
    queryKey: ['chakra-scores'],
    enabled: enabled && hasBackend,
    queryFn: () => fetchLatestChakraScores(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (journals.data?.length) {
      syncEntriesFromCloud(journals.data.map(rowToEntry));
    }
  }, [journals.data, syncEntriesFromCloud]);

  useEffect(() => {
    if (scores.data && Object.keys(scores.data).length) {
      applyCloudScores(scores.data);
    }
  }, [scores.data, applyCloudScores]);

  useEffect(() => {
    if (!enabled || !hasBackend) return;
    void flushOutbox();
  }, [enabled, journals.isSuccess]);
}

async function flushOutbox() {
  const ops = await peekOutbox();
  for (const op of ops) {
    try {
      if (op.type === 'checkin') {
        await upsertDailyCheckIn(op.payload as unknown as DailyCheckInInput);
      } else if (op.type === 'journal') {
        const p = op.payload as {
          body: string;
          modality?: Modality;
          seededChakra?: ChakraKey;
        };
        await createJournalEntry({
          body: p.body,
          modality: p.modality,
          seededChakra: p.seededChakra,
        });
      } else if (op.type === 'frequency_session') {
        const p = op.payload as {
          chakra: ChakraKey;
          hz: number;
          durationS: number;
          beatHz: number;
        };
        await recordFrequencySession({
          chakra: p.chakra,
          baseFrequencyHz: p.hz,
          beatFrequencyHz: p.beatHz,
          durationS: p.durationS,
        });
      } else if (op.type === 'analytics') {
        await trackAnalytics(String(op.payload.eventName), (op.payload.properties as Record<string, unknown>) ?? {});
      }
      await removeOutboxOp(op.id);
    } catch {
      // leave in outbox for next attempt
      break;
    }
  }
}
