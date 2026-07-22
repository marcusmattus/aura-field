/**
 * Hydrate cloud journals + chakra scores + check-ins into the Zustand cache,
 * and flush the offline outbox when online / on app foreground.
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  createJournalEntry,
  fetchLatestChakraScores,
  fetchTodayCheckIns,
  invokeFunction,
  listFrequencySessions,
  listJournalEntries,
  recordFrequencySession,
  trackAnalytics,
  updateJournalEntry,
  uploadVoiceNote,
  upsertDailyCheckIn,
  type DailyCheckInInput,
} from '@/lib/db';
import { isChakraKey } from '@/lib/chakras';
import { hasBackend, supabase } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';
import { peekOutbox, removeOutboxOp } from '@/lib/sync/outbox';
import type { ChakraKey, CompletedSession, EntryTag, JournalEntry, Modality } from '@/lib/types';

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
  const syncSessionsFromCloud = useChakraStore((s) => s.syncSessionsFromCloud);
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

  const sessions = useQuery({
    queryKey: ['frequency-sessions'],
    enabled: enabled && hasBackend,
    queryFn: () => listFrequencySessions(50),
    staleTime: 30_000,
  });

  const checkins = useQuery({
    queryKey: ['checkins'],
    enabled: enabled && hasBackend,
    queryFn: () => fetchTodayCheckIns(),
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
    if (!sessions.data?.length) return;
    const mapped: CompletedSession[] = sessions.data
      .filter((row) => isChakraKey(row.chakra_key))
      .map((row) => ({
        id: row.id,
        sessionKey: `freq-${row.chakra_key}`,
        chakra: row.chakra_key as ChakraKey,
        hz: Number(row.base_frequency_hz),
        durationS: Number(row.duration_s),
        completedAt: new Date(row.created_at).getTime(),
      }));
    if (mapped.length) syncSessionsFromCloud(mapped);
  }, [sessions.data, syncSessionsFromCloud]);

  // Keep query subscribed so check-in invalidation refreshes cloud data.
  useEffect(() => {
    void checkins.data;
  }, [checkins.data]);

  useEffect(() => {
    if (!enabled || !hasBackend) return;
    void flushOutbox();
  }, [enabled, journals.isSuccess, checkins.isSuccess]);

  useEffect(() => {
    if (!enabled || !hasBackend) return undefined;
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void flushOutbox();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [enabled]);
}

export async function flushOutbox() {
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
          voiceUrl?: string;
          voiceDurationS?: number;
        };
        let voicePath: string | undefined;
        let body = p.body;
        if (p.voiceUrl) {
          voicePath = await uploadVoiceNote(p.voiceUrl);
        }
        const row = await createJournalEntry({
          body,
          modality: p.modality,
          seededChakra: p.seededChakra,
          voiceStoragePath: voicePath,
          voiceDurationS: p.voiceDurationS,
        });
        if (voicePath && supabase) {
          const { data: userData } = await supabase.auth.getUser();
          const transcribed = await invokeFunction<{ transcript?: string }>('transcribe-voice', {
            storagePath: voicePath,
            journalEntryId: row.id,
            userId: userData.user?.id,
          });
          const transcript = transcribed.data?.transcript?.trim();
          if (transcript && transcript !== body) {
            await updateJournalEntry(row.id, { body: transcript, transcript });
          }
        }
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
        await trackAnalytics(
          String(op.payload.eventName),
          (op.payload.properties as Record<string, unknown>) ?? {},
        );
      }
      await removeOutboxOp(op.id);
    } catch {
      // leave in outbox for next attempt
      break;
    }
  }
}
