import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'heroui-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Display, Mono } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import {
  insertChakraScores,
  invokeFunction,
  trackAnalytics,
  upsertDailyCheckIn,
  type CheckInKind,
  type DailyCheckInInput,
} from '@/lib/db';
import { hasBackend, supabase } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';
import { enqueueOutbox } from '@/lib/sync/outbox';
import type { ChakraKey } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.body;
const MUTE = '#8a90a6';

const MORNING_SCALES: { key: keyof DailyCheckInInput; label: string }[] = [
  { key: 'mood', label: 'Mood' },
  { key: 'energy', label: 'Energy' },
  { key: 'focus', label: 'Focus' },
  { key: 'stress', label: 'Stress' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'body', label: 'Body' },
  { key: 'breathing', label: 'Breathing' },
];

function scoresFromCheckIn(input: DailyCheckInInput): { chakra: ChakraKey; score: number }[] {
  // Lightweight mapping from check-in axes → nodes (observational, not diagnostic)
  const m = (n?: number) => (typeof n === 'number' ? n * 10 : 50);
  const rows: { chakra: ChakraKey; score: number }[] = [
    { chakra: 'heart', score: m(input.mood) },
    { chakra: 'solar', score: m(input.energy) },
    { chakra: 'third', score: m(input.focus) },
    { chakra: 'root', score: Math.max(0, 100 - m(input.stress) + 50) / 1.5 },
    { chakra: 'earth', score: m(input.sleep) },
    { chakra: 'soul', score: m(input.purpose) },
    { chakra: 'solar', score: m(input.confidence) },
    { chakra: 'sacral', score: m(input.body) },
    { chakra: 'throat', score: m(input.breathing) },
  ];
  return rows.map((row) => ({
    chakra: row.chakra,
    score: Math.min(100, Math.max(0, Math.round(row.score))),
  }));
}

export default function CheckInScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const hour = new Date().getHours();
  const defaultKind: CheckInKind = hour >= 15 ? 'evening' : 'morning';
  const [kind, setKind] = useState<CheckInKind>(defaultKind);
  const [scales, setScales] = useState<Record<string, number>>({});
  const [wins, setWins] = useState('');
  const [challenges, setChallenges] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [lessons, setLessons] = useState('');
  const [note, setNote] = useState('');
  const recompute = useChakraStore((s) => s.recompute);

  const title = kind === 'morning' ? 'Morning alignment' : 'Evening reflection';

  const payload = useMemo((): DailyCheckInInput => {
    const base: DailyCheckInInput = {
      kind,
      journal_note: note || undefined,
    };
    if (kind === 'morning') {
      for (const s of MORNING_SCALES) {
        const v = scales[s.key as string];
        if (typeof v === 'number') {
          // oxlint-disable-next-line typescript/no-explicit-any -- dynamic scale keys
          (base as any)[s.key] = v;
        }
      }
    } else {
      base.wins = wins || undefined;
      base.challenges = challenges || undefined;
      base.gratitude = gratitude || undefined;
      base.lessons = lessons || undefined;
      if (typeof scales.mood === 'number') base.mood = scales.mood;
      if (typeof scales.energy === 'number') base.energy = scales.energy;
    }
    return base;
  }, [kind, scales, wins, challenges, gratitude, lessons, note]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!hasBackend) {
        await enqueueOutbox({ type: 'checkin', payload: payload as unknown as Record<string, unknown> });
        return { offline: true };
      }
      try {
        const row = await upsertDailyCheckIn(payload);
        const mapped = scoresFromCheckIn(payload);
        // Deduplicate by chakra (keep last)
        const byKey = new Map(mapped.map((m) => [m.chakra, m]));
        await insertChakraScores(
          [...byKey.values()].map((m) => ({
            chakra: m.chakra,
            score: m.score,
            source: 'checkin',
          })),
        );

        const { data: userData } = await supabase!.auth.getUser();
        if (userData.user) {
          void invokeFunction('reflect', {
            userId: userData.user.id,
            sourceType: 'checkin',
            sourceId: row.id,
            content: JSON.stringify(payload),
            fieldScores: Object.fromEntries([...byKey.entries()].map(([k, v]) => [k, v.score])),
            period: 'daily',
          });
        }

        void trackAnalytics('checkin_completed', { kind });
        return { offline: false, row };
      } catch {
        await enqueueOutbox({ type: 'checkin', payload: payload as unknown as Record<string, unknown> });
        return { offline: true };
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['checkins'] });
      void qc.invalidateQueries({ queryKey: ['chakra-scores'] });
      recompute();
      router.back();
    },
  });

  return (
    <View className="bg-field flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar */}
      <StatusBar style="light" />
      <View className="pt-safe-offset-3 flex-row items-center justify-between px-5">
        <Pressable hitSlop={12} onPress={() => router.back()} className="flex-row items-center gap-1">
          <ChevronLeft color={MUTE} size={16} />
          <Mono>BACK</Mono>
        </Pressable>
        <View className="flex-row gap-2">
          {(['morning', 'evening'] as CheckInKind[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: kind === k ? ACCENT : '#141a28' }}
            >
              <Mono style={{ color: kind === k ? '#0a0e18' : MUTE }}>
                {k === 'morning' ? 'MORNING' : 'EVENING'}
              </Mono>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <Mono className="mt-4" style={{ color: ACCENT }}>
          DAILY ALIGNMENT
        </Mono>
        <Display size={28} className="mt-2">
          {title}
        </Display>
        <Text className="text-mute mt-2" style={{ fontSize: 14, lineHeight: 22 }}>
          A quick self-scan. Observations only — never a diagnosis.
        </Text>

        {kind === 'morning' ? (
          <View className="mt-6 gap-5">
            {MORNING_SCALES.map((s) => (
              <ScaleRow
                key={s.key}
                label={s.label}
                value={scales[s.key] ?? 5}
                onChange={(v) => setScales((prev) => ({ ...prev, [s.key]: v }))}
              />
            ))}
          </View>
        ) : (
          <View className="mt-6 gap-4">
            <ScaleRow
              label="Mood"
              value={scales.mood ?? 5}
              onChange={(v) => setScales((prev) => ({ ...prev, mood: v }))}
            />
            <ScaleRow
              label="Energy"
              value={scales.energy ?? 5}
              onChange={(v) => setScales((prev) => ({ ...prev, energy: v }))}
            />
            <TextArea label="WINS" value={wins} onChangeText={setWins} />
            <TextArea label="CHALLENGES" value={challenges} onChangeText={setChallenges} />
            <TextArea label="GRATITUDE" value={gratitude} onChangeText={setGratitude} />
            <TextArea label="LESSONS" value={lessons} onChangeText={setLessons} />
          </View>
        )}

        <View className="mt-6">
          <TextArea
            label="JOURNAL NOTE"
            value={note}
            onChangeText={setNote}
            placeholder="Anything worth noticing…"
          />
        </View>

        <Pressable
          disabled={mutation.isPending}
          className="mt-8 items-center rounded-full py-4"
          style={{ backgroundColor: ACCENT, opacity: mutation.isPending ? 0.6 : 1 }}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#0a0e18" />
          ) : (
            <Text className="font-mono-bold" style={{ color: '#0a0e18', fontSize: 13 }}>
              SAVE CHECK-IN
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ScaleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <View className="mb-2 flex-row items-center justify-between">
        <Mono>{label.toUpperCase()}</Mono>
        <Mono style={{ color: ACCENT }}>{value}/10</Mono>
      </View>
      <View className="flex-row gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            className="h-8 flex-1 items-center justify-center rounded-md"
            style={{ backgroundColor: n <= value ? ACCENT : '#141a28' }}
          >
            <Text style={{ fontSize: 10, color: n <= value ? '#0a0e18' : MUTE }}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TextArea({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View>
      <Mono className="mb-2">{label}</Mono>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#3a4255"
        multiline
        className="bg-panel border-line text-ink min-h-[72px] rounded-2xl border px-4 py-3"
        style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: '#e9ecf5', textAlignVertical: 'top' }}
      />
    </View>
  );
}
