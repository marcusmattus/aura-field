import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { SessionAtmosphereView } from '@/components/SessionAtmosphere';
import { SoundVisualizer } from '@/components/SoundVisualizer';
import { Chip, Display, Mono } from '@/components/ui';
import { useToneSession } from '@/hooks/useToneSession';
import { sessionForChakra } from '@/lib/agents/coach';
import { CHAKRA_BY_KEY, isChakraKey } from '@/lib/chakras';
import { atmosphereForKey } from '@/lib/frequency/atmosphere';
import { FREQUENCY_BY_KEY } from '@/lib/frequency/registry';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

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
  const atmosphere = useMemo(() => atmosphereForKey(key), [key]);
  const accent = atmosphere.control;
  const label = atmosphere.label;
  const isBreath = mode === 'breath';
  const minimal = atmosphere.uiMode === 'minimal';

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
  const active = playing && !done;

  return (
    <View className="flex-1" style={{ backgroundColor: atmosphere.backgroundBottom }}>
      <SessionAtmosphereView atmosphere={atmosphere} active={active} />

      <View className="pt-safe-offset-3 z-10 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Mono style={{ color: accent }}>
              {minimal
                ? `${node.baseFrequencyHz} HZ`
                : isBreath
                  ? 'BREATHWORK · 4-4-4-4'
                  : 'NOW PLAYING · SESSION'}
            </Mono>
            {!minimal ? (
              <Display size={22} className="mt-1" color={label}>
                {isBreath ? `${def.name} Breath` : session.title}
              </Display>
            ) : (
              <Display size={28} className="mt-2" color={label}>
                {def.name}
              </Display>
            )}
          </View>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronDown color={label} size={22} />
          </Pressable>
        </View>
      </View>

      <View className="z-10 flex-1 items-center justify-center px-6">
        {!minimal ? (
          <SoundVisualizer
            size={Math.min(width - 60, 300)}
            color={atmosphere.accent}
            playing={active}
          />
        ) : (
          <View style={{ height: Math.min(width - 80, 220) }} />
        )}
        <Display size={minimal ? 34 : 26} className="mt-6" color={label}>
          {node.baseFrequencyHz} Hz
        </Display>
        {!minimal ? (
          <>
            <Text className="mt-1 font-mono" style={{ fontSize: 12, color: label, opacity: 0.7 }}>
              {def.name.toLowerCase()} · {node.brainwaveBand} · beat {node.beatFrequencyHz} Hz
            </Text>
            <View className="mt-3 flex-row gap-2">
              <Chip label={node.solfeggioIntent.split(',')[0]} color={accent} />
            </View>
          </>
        ) : (
          <Text className="mt-2 font-mono" style={{ fontSize: 12, color: label, opacity: 0.55 }}>
            nearly still
          </Text>
        )}
      </View>

      <View className="pb-safe-offset-6 z-10 px-8">
        <View
          className="mb-4 h-1 overflow-hidden rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
        >
          <View
            style={{
              width: `${(elapsed / totalS) * 100}%`,
              height: '100%',
              backgroundColor: accent,
            }}
          />
        </View>
        <View className="mb-4 flex-row justify-between">
          <Mono style={{ color: label }}>{fmt(elapsed)}</Mono>
          <Mono style={{ color: label }}>{done ? 'COMPLETE' : fmt(remaining)}</Mono>
        </View>
        <View className="flex-row items-center justify-center gap-8">
          {!minimal ? (
            <Pressable hitSlop={12} onPress={() => setElapsed(0)}>
              <SkipBack color={label} size={22} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
          <Pressable
            onPress={() => setPlaying((p) => !p)}
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{
              backgroundColor: accent,
              opacity: minimal ? 0.85 : 1,
            }}
          >
            {active ? (
              <Pause color={atmosphere.backgroundBottom} size={26} fill={atmosphere.backgroundBottom} />
            ) : (
              <Play color={atmosphere.backgroundBottom} size={26} fill={atmosphere.backgroundBottom} />
            )}
          </Pressable>
          {!minimal ? (
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
              <SkipForward color={label} size={22} />
            </Pressable>
          ) : (
            <View style={{ width: 22 }} />
          )}
        </View>
      </View>
    </View>
  );
}
