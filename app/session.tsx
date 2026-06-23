import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronDown, Headphones, Pause, Play, SkipBack, SkipForward } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { SoundVisualizer } from '@/components/SoundVisualizer';
import { Chip, Display, Mono } from '@/components/ui';
import { useSessionTone } from '@/hooks/useToneSession';
import { CHAKRA_BY_KEY, isChakraKey } from '@/lib/chakras';
import { coreSessionForChakra, deriveSession, derivedById, type DerivedSession } from '@/lib/sound';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/** Resolve the session to play from the route params, always derived. */
function resolveSession(params: {
  id?: string;
  chakra?: string;
  baseHz?: string;
  beatHz?: string;
  durationSec?: string;
  name?: string;
}): DerivedSession {
  // 1) a real library id
  if (params.id) {
    const found = derivedById(params.id);
    if (found) return found;
  }
  // 2) raw frequency composed by the agent (or the suggested card)
  const baseHz = Number(params.baseHz);
  if (Number.isFinite(baseHz) && baseHz > 0) {
    const beat = Number(params.beatHz);
    const duration = Number(params.durationSec);
    return deriveSession({
      id: params.id ?? 'composed',
      name: params.name ?? 'Session',
      packId: 'composed',
      baseHz,
      beatHz: Number.isFinite(beat) && beat > 0 ? beat : undefined,
      durationSec: Number.isFinite(duration) && duration > 0 ? duration : 600,
    });
  }
  // 3) a node — open its Solfeggio Core drone (Inspector launch)
  const key: ChakraKey = isChakraKey(params.chakra) ? params.chakra : 'third';
  return (
    coreSessionForChakra(key) ??
    deriveSession({
      id: 'core-third',
      name: 'Third Eye Drone',
      packId: 'solfeggio-core',
      baseHz: 852,
      durationSec: 600,
    })
  );
}

export default function SessionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  // oxlint-disable-next-line typescript/no-unnecessary-type-arguments -- explicit param shape; false positive on expo-router's overloaded generic
  const params = useLocalSearchParams<{
    id?: string;
    chakra?: string;
    baseHz?: string;
    beatHz?: string;
    durationSec?: string;
    name?: string;
    mode?: 'breath';
  }>();
  const isBreath = params.mode === 'breath';

  const session = useMemo(() => resolveSession(params), [params]);
  const def = CHAKRA_BY_KEY[session.chakra];

  const completeSession = useChakraStore((s) => s.completeSession);

  // Compressed demo duration so the loop closes quickly in preview.
  const totalS = isBreath ? 60 : 90;

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const completedRef = useRef(false);

  // Breath sessions are silent (paced breathing); sound sessions play the tone.
  useSessionTone({
    baseHz: session.baseHz,
    beatHz: session.beatHz,
    noise: session.noise,
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
            sessionKey: session.id,
            chakra: session.chakra,
            hz: session.baseHz,
            durationS: session.durationSec,
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
    session.id,
    session.chakra,
    session.baseHz,
    session.durationSec,
  ]);

  const done = elapsed >= totalS;
  const remaining = totalS - elapsed;
  const accent = session.palette.core;

  return (
    <View className="bg-field flex-1">
      <View className="pt-safe-offset-3 px-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Mono style={{ color: accent }}>
              {isBreath ? 'BREATHWORK · 4-4-4-4' : 'NOW PLAYING · SESSION'}
            </Mono>
            <Display size={22} className="mt-1">
              {isBreath ? `${def.name} Breath` : session.name}
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
          core={session.palette.core}
          ring={session.palette.ring}
          rings={session.rings}
          tempoS={session.tempoS}
          soft={session.glow}
          playing={playing && !done}
        />
        <Display size={26} className="mt-6">
          {session.baseHz} Hz · {session.bandIntent}
        </Display>
        <Text className="text-mute mt-1 font-mono" style={{ fontSize: 12 }}>
          {session.label}
        </Text>
        {session.beatHz ? (
          <View className="mt-3 flex-row items-center gap-1.5">
            <Headphones color="#8a90a6" size={13} />
            <Text className="text-faint font-mono" style={{ fontSize: 10 }}>
              BEST WITH HEADPHONES · BINAURAL {session.beatHz} HZ
            </Text>
          </View>
        ) : null}
        <View className="mt-4 flex-row flex-wrap justify-center gap-2">
          {(session.tags ?? []).map((t) => (
            <Chip key={t} label={t} color={accent} />
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
            style={{ width: `${(elapsed / totalS) * 100}%`, backgroundColor: accent }}
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
            style={{ backgroundColor: done ? '#1e2535' : accent }}
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
