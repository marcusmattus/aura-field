import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { SoundVisualizer } from '@/components/SoundVisualizer';
import { Chip, Display, LockOverlay, Mono, Panel } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { deriveSession, PACKS, sessionsInPack, suggestFieldSession } from '@/lib/sound';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.sound;

export default function SoundScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const states = useChakraStore((s) => s.states);
  const sessions = useChakraStore((s) => s.sessions);
  const subscribed = useChakraStore((s) => s.subscribed);

  // Frequency agent → a composed session for the current field; fully derived.
  const suggested = useMemo(() => deriveSession(suggestFieldSession(states)), [states]);

  return (
    <View className="bg-field flex-1">
      {!subscribed && (
        <LockOverlay
          surface="SOUND · FULL ACCESS"
          accent={ACCENT}
          title="Unlock the library"
          body="Every session — Solfeggio Core, Restoration, Ground, Heart and Clarity — tuned to the node that needs it most, is part of the membership."
        />
      )}
      <ScrollView
        className="bg-field flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-safe px-4">
          <Mono className="text-sound mt-3">SOUND · FREQUENCY LIBRARY</Mono>
          <Display size={26} className="mt-1">
            Tune the field
          </Display>
        </View>

        <View className="mt-4 px-4">
          <Mono className="mb-2">SUGGESTED FOR YOU NOW</Mono>
          <Panel className="items-center p-5">
            <SoundVisualizer
              size={Math.min(width - 120, 200)}
              core={suggested.palette.core}
              ring={suggested.palette.ring}
              rings={suggested.rings}
              tempoS={suggested.tempoS}
              soft={suggested.glow}
              playing={false}
            />
            <Display size={20} className="mt-3">
              {suggested.name}
            </Display>
            <Text className="text-mute mt-1 font-mono" style={{ fontSize: 12 }}>
              {suggested.label}
            </Text>
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {(suggested.tags ?? []).map((t) => (
                <Chip key={t} label={t} color={suggested.palette.core} />
              ))}
            </View>
            <Pressable
              className="mt-4 flex-row items-center gap-2 rounded-full px-6 py-3"
              style={{ backgroundColor: suggested.palette.core }}
              onPress={() =>
                router.push({
                  pathname: '/session',
                  params: {
                    id: suggested.id,
                    name: suggested.name,
                    baseHz: String(suggested.baseHz),
                    beatHz: suggested.beatHz == null ? '' : String(suggested.beatHz),
                    durationSec: String(suggested.durationSec),
                  },
                })
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
          <View className="border-line mb-3 flex-row items-center justify-between border-b pb-2">
            <Mono>FULL LIBRARY</Mono>
            <Mono>{sessions.length} PLAYED</Mono>
          </View>

          {PACKS.map((pack) => (
            <View key={pack.id} className="mb-5">
              <Mono className="text-sound">{pack.name.toUpperCase()}</Mono>
              <Text
                className="text-faint mt-0.5 mb-2"
                style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }}
              >
                {pack.note}
              </Text>
              <View className="gap-2">
                {sessionsInPack(pack.id).map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => router.push({ pathname: '/session', params: { id: d.id } })}
                  >
                    <Panel className="flex-row items-center gap-3 p-3">
                      <View
                        className="h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: d.palette.halo }}
                      >
                        <View
                          className="h-3.5 w-3.5 rounded-full"
                          style={{ backgroundColor: d.palette.core }}
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-ink"
                          style={{ fontFamily: 'Inter_500Medium', fontSize: 14 }}
                        >
                          {d.name}
                        </Text>
                        <Text className="text-faint font-mono" style={{ fontSize: 10 }}>
                          {d.label.toUpperCase()}
                        </Text>
                      </View>
                      <Play color={d.palette.core} size={15} />
                    </Panel>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
