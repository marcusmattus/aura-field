import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { SoundVisualizer } from '@/components/SoundVisualizer';
import { Chip, Display, LockOverlay, Mono, Panel } from '@/components/ui';
import { suggestSession } from '@/lib/agents/coach';
import { CHAKRAS, SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.sound;

export default function SoundScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const states = useChakraStore((s) => s.states);
  const sessions = useChakraStore((s) => s.sessions);
  const subscribed = useChakraStore((s) => s.subscribed);

  const suggested = useMemo(() => suggestSession(states), [states]);

  return (
    <View className="bg-field flex-1">
      {!subscribed && (
        <LockOverlay
          surface="SOUND · FULL ACCESS"
          accent={ACCENT}
          title="Unlock the library"
          body="All nine Solfeggio sessions, tuned to the node that needs it most, are part of the membership."
        />
      )}
      <ScrollView
        className="bg-field flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-safe px-4">
          <Mono className="text-sound mt-3">SOUND · SOLFEGGIO LIBRARY</Mono>
          <Display size={26} className="mt-1">
            Tune the field
          </Display>
        </View>

        <View className="mt-4 px-4">
          <Mono className="mb-2">SUGGESTED FOR YOU NOW</Mono>
          <Panel className="items-center p-5">
            <SoundVisualizer size={Math.min(width - 120, 200)} color={ACCENT} playing={false} />
            <Display size={20} className="mt-3">
              {suggested.title}
            </Display>
            <Text className="text-mute mt-1 font-mono" style={{ fontSize: 12 }}>
              {suggested.hz} Hz · {suggested.brainwaveBand}
            </Text>
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {suggested.tags.map((t) => (
                <Chip key={t} label={t} color={ACCENT} />
              ))}
            </View>
            <Pressable
              className="mt-4 flex-row items-center gap-2 rounded-full px-6 py-3"
              style={{ backgroundColor: ACCENT }}
              onPress={() =>
                router.push({ pathname: '/session', params: { chakra: suggested.chakra } })
              }
            >
              <Play color="#0a0e18" size={15} fill="#0a0e18" />
              <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                BEGIN SESSION
              </Text>
            </Pressable>
          </Panel>
        </View>

        <View className="mt-6 px-4">
          <View className="border-line mb-2 flex-row items-center justify-between border-b pb-2">
            <Mono>FULL LIBRARY · 9 FREQUENCIES</Mono>
            <Mono>{sessions.length} PLAYED</Mono>
          </View>
          <View className="gap-2">
            {CHAKRAS.map((c) => (
              <Pressable
                key={c.key}
                onPress={() => router.push({ pathname: '/session', params: { chakra: c.key } })}
              >
                <Panel className="flex-row items-center gap-3 p-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${c.color}22` }}
                  >
                    <View
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: c.color }}
                    />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-ink"
                      style={{ fontFamily: 'Inter_500Medium', fontSize: 14 }}
                    >
                      {c.name} Restoration
                    </Text>
                    <Text className="text-faint font-mono" style={{ fontSize: 10 }}>
                      {c.solfeggioHz} HZ · {c.noteName} · {c.bija.toUpperCase()}
                    </Text>
                  </View>
                  <Play color={c.color} size={15} />
                </Panel>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
