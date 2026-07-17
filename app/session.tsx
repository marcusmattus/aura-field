import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { SoundVisualizer } from '@/components/SoundVisualizer';
import { Chip, Display, Mono } from '@/components/ui';
import { useToneSession } from '@/hooks/useToneSession';
import { sessionForChakra } from '@/lib/agents/coach';
import { CHAKRA_BY_KEY, isChakraKey, SURFACE_ACCENT } from '@/lib/chakras';
import { paletteForKey } from '@/lib/frequency';
import { FREQUENCY_BY_KEY } from '@/lib/frequency/registry';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

const FALLBACK_ACCENT = SURFACE_ACCENT.sound;

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function SessionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { chakra, mode } = useLocalSearchParams<{ chakra: ChakraKey; mode?: string }>();
  const key: ChakraKey = isChakraKey(chakra) ? chakra : 'third';
  const def = CHAKRA_BY_KEY[key];
  const node = FREQUENCY_BY_KEY[key];
  const palette = paletteForKey(key);
  const accent = palette.color || FALLBACK_ACCENT;
  const isBreath = mode === 'breath';

  const completeSession = useChakraStore((s) => s.completeSession);

  const session = sessionForChakra(key);
  const totalS = isBreath ? 60 : 90;

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const completedRef = useRef(false);

  useToneSession({
    carrierHz: node.baseFrequencyHz,
    beatHz: node.beatFrequencyHz,
    band: `${node.brainwaveBand} ${node.beatFrequencyHz} Hz`,
    playing: playing && !isBreath,
  });

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (next >= totalS && !completedRef.current) {
          completedRef.current = true;
          completeSession({
            sessionKey: session.key,
            chakra: key,
            hz: node.baseFrequencyHz,
            durationS: session.durationS,
            beatHz: node.beatFrequencyHz,
            brainwaveBand: node.brainwaveBand,
          });
        }
        return Math.min(next, totalS);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [
    playing,
    totalS,
    completeSession,
    session.key,
    session.durationS,
    key,
    node.baseFrequencyHz,
    node.beatFrequencyHz,
    node.brainwaveBand,
  ]);

  const done = elapsed >= totalS;
  const remaining = totalS - elapsed;

  return (
    <View className="bg-field flex-1" style={{ backgroundColor: palette.gradient[0] }}>
      <View className="pt-safe-offset-3 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Mono style={{ color: accent }}>
              {isBreath ? 'BREATHWORK · 4-4-4-4' : 'NOW PLAYING · SESSION'}
            </Mono>
            <Display size={22} className="mt-1">
              {isBreath ? `${def.name} Breath` : session.title}
            </Display>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronDown color="#8a90a6" size={22} />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 items-center justify-center">
        <SoundVisualizer
          size={Math.min(width - 60, 320)}
          color={accent}
          playing={playing && !done}
        />
        <Display size={26} className="mt-6">
          {node.baseFrequencyHz} Hz · {def.name.toLowerCase()} carrier
        </Display>
        <Text className="text-mute mt-1 font-mono" style={{ fontSize: 12 }}>
          {node.brainwaveBand} · beat {node.beatFrequencyHz} Hz ·{' '}
          {Math.round(session.durationS / 60)} min
        </Text>
        <View className="mt-3 flex-row gap-2">
          <Chip label={node.solfeggioIntent.split(',')[0]} color={accent} />
        </View>
      </View>

      <View className="pb-safe-offset-6 px-8">
        <View className="mb-4 h-1 overflow-hidden rounded-full" style={{ backgroundColor: '#1a2234' }}>
          <View
            style={{
              width: `${(elapsed / totalS) * 100}%`,
              height: '100%',
              backgroundColor: accent,
            }}
          />
        </View>
        <View className="mb-4 flex-row justify-between">
          <Mono>{fmt(elapsed)}</Mono>
          <Mono>{done ? 'COMPLETE' : fmt(remaining)}</Mono>
        </View>
        <View className="flex-row items-center justify-center gap-8">
          <Pressable hitSlop={12} onPress={() => setElapsed(0)}>
            <SkipBack color="#e9ecf5" size={22} />
          </Pressable>
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: accent }}
          >
            {playing && !done ? (
              <Pause color="#0a0e18" size={26} fill="#0a0e18" />
            ) : (
              <Play color="#0a0e18" size={26} fill="#0a0e18" />
            )}
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => {
              setElapsed(totalS);
              if (!completedRef.current) {
                completedRef.current = true;
                completeSession({
                  sessionKey: session.key,
                  chakra: key,
                  hz: node.baseFrequencyHz,
                  durationS: session.durationS,
                  beatHz: node.beatFrequencyHz,
                  brainwaveBand: node.brainwaveBand,
                });
              }
            }}
          >
            <SkipForward color="#e9ecf5" size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
