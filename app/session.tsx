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
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.sound;

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
  const isBreath = mode === 'breath';

  const completeSession = useChakraStore((s) => s.completeSession);

  // Use a compressed demo duration so the loop closes quickly in preview.
  const session = sessionForChakra(key);
  const totalS = isBreath ? 60 : 90;

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const completedRef = useRef(false);

  // Breath sessions are silent (paced breathing); sound sessions play the tone.
  useToneSession({
    carrierHz: session.hz,
    band: session.brainwaveBand,
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
            hz: session.hz,
            durationS: session.durationS,
          });
        }
        return Math.min(next, totalS);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, totalS, completeSession, session.key, session.hz, session.durationS, key]);

  const done = elapsed >= totalS;
  const remaining = totalS - elapsed;

  return (
    <View className="bg-field flex-1">
      <View className="pt-safe-offset-3 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Mono className="text-sound">
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
          color={ACCENT}
          playing={playing && !done}
        />
        <Display size={26} className="mt-6">
          {session.hz} Hz · {def.name.toLowerCase()} carrier
        </Display>
        <Text className="text-mute mt-1 font-mono" style={{ fontSize: 12 }}>
          {session.brainwaveBand} · {Math.round(session.durationS / 60)} min
        </Text>
        <View className="mt-4 flex-row flex-wrap justify-center gap-2">
          {session.tags.map((t) => (
            <Chip key={t} label={t} color={ACCENT} />
          ))}
        </View>
        {done ? (
          <Text
            className="mt-5 font-mono"
            style={{ fontSize: 12, color: '#36f5a6', letterSpacing: 1 }}
          >
            ✓ SESSION COMPLETE · {def.name.toUpperCase()} LIFTED · +40 XP
          </Text>
        ) : null}
      </View>

      <View className="pb-safe-offset-8 px-8">
        {/* scrubber */}
        <View className="flex-row items-center justify-between">
          <Text className="text-mute font-mono" style={{ fontSize: 11 }}>
            {fmt(elapsed)}
          </Text>
          <Text className="text-faint font-mono" style={{ fontSize: 11 }}>
            -{fmt(remaining)}
          </Text>
        </View>
        <View className="bg-line mt-2 h-1 overflow-hidden rounded-full">
          <View
            className="h-full rounded-full"
            style={{ width: `${(elapsed / totalS) * 100}%`, backgroundColor: ACCENT }}
          />
        </View>

        <View className="mt-6 flex-row items-center justify-center gap-8">
          <Pressable onPress={() => setElapsed((e) => Math.max(0, e - 15))} hitSlop={10}>
            <SkipBack color="#8a90a6" size={22} />
          </Pressable>
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            disabled={done}
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: done ? '#1e2535' : ACCENT }}
          >
            {playing && !done ? (
              <Pause color="#0a0e18" size={24} fill="#0a0e18" />
            ) : (
              <Play
                color={done ? '#565c72' : '#0a0e18'}
                size={24}
                fill={done ? '#565c72' : '#0a0e18'}
              />
            )}
          </Pressable>
          <Pressable onPress={() => setElapsed(totalS)} hitSlop={10}>
            <SkipForward color="#8a90a6" size={22} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
