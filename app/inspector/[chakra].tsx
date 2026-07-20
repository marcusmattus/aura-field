import { useLocalSearchParams, useRouter } from 'expo-router';
import { PenLine, Play, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Chip, Display, Mono, Panel } from '@/components/ui';
import { surfacedSignalsFor } from '@/lib/agents/coach';
import { CHAKRA_BY_KEY, isChakraKey } from '@/lib/chakras';
import { paletteForKey } from '@/lib/frequency';
import { FREQUENCY_BY_KEY } from '@/lib/frequency/registry';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

export default function InspectorScreen() {
  const router = useRouter();
  const { chakra } = useLocalSearchParams<{ chakra: ChakraKey }>();
  const key: ChakraKey = isChakraKey(chakra) ? chakra : 'third';
  const def = CHAKRA_BY_KEY[key];
  const node = FREQUENCY_BY_KEY[key];
  const palette = paletteForKey(key);

  const states = useChakraStore((s) => s.states);
  const entries = useChakraStore((s) => s.entries);
  const sessions = useChakraStore((s) => s.sessions);
  const state = states.find((s) => s.key === key);
  const energy = state?.energy ?? 50;
  const trend = state?.trend7d ?? 0;

  const signals = useMemo(() => surfacedSignalsFor(key, entries, Date.now()), [key, entries]);
  const relatedJournal = entries
    .filter((e) => e.seededChakra === key || e.tags.some((t) => t.chakra === key))
    .slice(0, 3);
  const relatedSessions = sessions.filter((s) => s.chakra === key).slice(0, 3);

  return (
    <View className="bg-field flex-1">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: palette.color }}>
              {def.name.split(' ')[0].toUpperCase()} · {(def.bija || node.bija || '').toUpperCase()} ·{' '}
              {node.baseFrequencyHz} HZ · beat {node.beatFrequencyHz}
            </Mono>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>

          <Display size={32} className="mt-2" color={palette.color}>
            {def.name}
          </Display>
          <Text className="text-mute mt-1" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>
            {def.sign}
          </Text>
          <Text className="text-mute mt-2" style={{ fontSize: 12 }}>
            {node.solfeggioIntent} · {node.brainwaveBand}
          </Text>

          <View className="mt-6 flex-row gap-8">
            <View>
              <Mono>ENERGY</Mono>
              <View className="mt-1 flex-row items-baseline">
                <Text className="font-mono-bold" style={{ fontSize: 36, color: palette.color }}>
                  {energy}
                </Text>
                <Text className="text-faint font-mono" style={{ fontSize: 13 }}>
                  /100
                </Text>
              </View>
            </View>
            <View>
              <Mono>7D TREND</Mono>
              <Text
                className="font-mono-bold mt-1"
                style={{ fontSize: 22, color: trend < 0 ? '#ff5c6e' : '#36f5a6' }}
              >
                {trend < 0 ? '↓' : '↑'} {Math.abs(trend)}%
              </Text>
            </View>
          </View>

          <Mono className="mt-6">ATTRIBUTES</Mono>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {def.attributes.map((a) => (
              <Chip key={a} label={a} color={palette.color} />
            ))}
          </View>

          <Mono className="mt-6">DERIVED COLOUR · FROM {node.baseFrequencyHz} HZ</Mono>
          <View className="mt-2 flex-row gap-2">
            {palette.gradient.map((g) => (
              <View
                key={g}
                className="h-8 flex-1 rounded-lg"
                style={{ backgroundColor: g }}
              />
            ))}
          </View>

          <Mono className="mt-6">JOURNAL REFERENCES</Mono>
          <View className="mt-2 gap-2">
            {relatedJournal.length === 0 ? (
              <Panel className="p-3">
                <Text className="text-faint" style={{ fontSize: 12 }}>
                  No linked journal entries yet.
                </Text>
              </Panel>
            ) : (
              relatedJournal.map((e) => (
                <Panel key={e.id} className="p-3">
                  <Text className="text-ink" style={{ fontSize: 13 }} numberOfLines={2}>
                    {e.body}
                  </Text>
                </Panel>
              ))
            )}
          </View>

          <Mono className="mt-6">FREQUENCY SESSIONS</Mono>
          <View className="mt-2 gap-2">
            {relatedSessions.length === 0 ? (
              <Panel className="p-3">
                <Text className="text-faint" style={{ fontSize: 12 }}>
                  No sessions completed for this node yet.
                </Text>
              </Panel>
            ) : (
              relatedSessions.map((s) => (
                <Panel key={s.id} className="flex-row justify-between p-3">
                  <Text className="text-ink" style={{ fontSize: 13 }}>
                    {s.hz} Hz
                  </Text>
                  <Mono>{Math.round(s.durationS / 60)} MIN</Mono>
                </Panel>
              ))
            )}
          </View>

          <Mono className="mt-6">SURFACED IN JOURNAL · LAST 7D</Mono>
          <View className="mt-2 gap-2">
            {signals.length === 0 ? (
              <Panel className="p-3">
                <Text
                  className="text-faint"
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 12 }}
                >
                  Nothing surfaced yet. Journaling teaches this node what to listen for.
                </Text>
              </Panel>
            ) : (
              signals.map((sig) => (
                <Panel key={sig.phrase} className="flex-row items-center justify-between p-3">
                  <Text
                    className="text-ink flex-1"
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}
                  >
                    {sig.phrase}
                  </Text>
                  <Text className="font-mono" style={{ fontSize: 12, color: palette.color }}>
                    ×{sig.count}
                  </Text>
                </Panel>
              ))
            )}
          </View>

          <View className="mt-7 flex-row gap-3">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
              style={{ backgroundColor: palette.color }}
              onPress={() => {
                router.replace({ pathname: '/session', params: { chakra: key } });
              }}
            >
              <Play color="#0a0e18" size={14} fill="#0a0e18" />
              <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                BEGIN {node.baseFrequencyHz} HZ SESSION
              </Text>
            </Pressable>
            <Pressable
              className="border-line flex-row items-center justify-center gap-2 rounded-xl border px-4 py-3.5"
              onPress={() => {
                router.back();
                router.navigate({ pathname: '/(tabs)/journal', params: { seed: key } });
              }}
            >
              <PenLine color="#e9ecf5" size={14} />
              <Text className="font-mono" style={{ fontSize: 12, color: '#e9ecf5' }}>
                REFLECT
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
