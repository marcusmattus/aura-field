import { useCameraPermissions, type CameraType } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Camera, ChevronRight, GitCompareArrows, Hand, RefreshCw, ScanLine } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Text } from 'heroui-native';

import { PalmCamera } from '@/components/palm/PalmCamera';
import { PalmCompare } from '@/components/palm/PalmCompare';
import { PalmRig, type PalmPhase } from '@/components/palm/PalmRig';
import { Display, Mono, Panel, SoftFade } from '@/components/ui';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import {
  channelContinuity,
  palmPointsFor,
  palmReading,
  PALM_DISCLAIMER,
  type PalmReading,
} from '@/lib/palm';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey, PalmHand } from '@/lib/types';

const ACCENT = '#36d6e7';

function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(style);
}

function PhaseHint({ phase }: { phase: PalmPhase }) {
  const label =
    phase === 'aligning'
      ? 'ALIGN PALM TO THE OUTLINE'
      : phase === 'scanning'
        ? 'LOCKING CONTOUR…'
        : 'LOCKED · DRAG · PINCH · ROTATE';
  return (
    <View
      className="absolute top-3 left-3 rounded-md px-2 py-1"
      style={{ backgroundColor: '#05060acc' }}
    >
      <Mono style={{ color: phase === 'locked' ? ACCENT : '#8a90a6' }}>{label}</Mono>
    </View>
  );
}

/**
 * Palm Field — the camera palm chakra map.
 *
 * Frames the hand, locks a guide contour to it, and projects the nine chakraOS
 * nodes onto fixed palm landmarks. Everything the points report comes from the
 * journal → field loop; the camera contributes nothing but the picture.
 */
export function PalmPanel({ width, active }: { width: number; active: boolean }) {
  const router = useRouter();
  const reduced = useReducedMotion();
  const states = useChakraStore((s) => s.states);
  const fieldIndex = useChakraStore((s) => s.fieldIndex);
  const palmScans = useChakraStore((s) => s.palmScans);
  const capturePalmScan = useChakraStore((s) => s.capturePalmScan);

  const [permission, requestPermission] = useCameraPermissions();
  const [hand, setHand] = useState<PalmHand>('right');
  const [facing, setFacing] = useState<CameraType>('front');
  const [phase, setPhase] = useState<PalmPhase>('aligning');
  const [reading, setReading] = useState<PalmReading | null>(null);
  const [compare, setCompare] = useState(false);
  const scan = useSharedValue(0);

  const granted = permission?.granted ?? false;
  const continuity = channelContinuity(states);
  const boxHeight = Math.round(width * 1.24);
  const points = palmPointsFor(hand);
  const current = palmScans[0];
  const previous = palmScans[1];

  const onLocked = useCallback(() => {
    setPhase('locked');
    tap(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  useEffect(() => {
    if (phase === 'scanning') {
      cancelAnimation(scan);
      scan.value = 0;
      scan.value = withTiming(
        1,
        { duration: reduced ? 500 : 2200, easing: Easing.out(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) runOnJS(onLocked)();
        },
      );
    } else if (phase === 'aligning') {
      cancelAnimation(scan);
      scan.value = 0;
    }
  }, [phase, reduced, scan, onLocked]);

  const startScan = () => {
    setReading(null);
    setPhase('scanning');
    tap();
  };

  const resetScan = () => {
    setPhase('aligning');
    setReading(null);
  };

  const analyze = () => {
    capturePalmScan(hand);
    setReading(palmReading(states, fieldIndex));
    setCompare(true);
    tap(Haptics.ImpactFeedbackStyle.Medium);
  };

  const openPoint = (key: ChakraKey) => {
    tap();
    router.push({ pathname: '/inspector/[chakra]', params: { chakra: key } });
  };

  return (
    <View className="px-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Mono className="text-body">PALM FIELD</Mono>
          <Text className="text-faint mt-1" style={{ fontSize: 11, lineHeight: 16 }}>
            Nine nodes projected onto your open hand.
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => setCompare((c) => !c)}
            className="border-line flex-row items-center gap-1.5 rounded-full border px-3 py-2"
            style={compare ? { borderColor: `${ACCENT}88`, backgroundColor: `${ACCENT}14` } : null}
            accessibilityRole="button"
          >
            <GitCompareArrows color={compare ? ACCENT : '#8a90a6'} size={12} />
            <Mono style={{ color: compare ? ACCENT : '#8a90a6' }}>COMPARE</Mono>
          </Pressable>
          <Pressable
            onPress={phase === 'scanning' ? undefined : phase === 'locked' ? resetScan : startScan}
            className="flex-row items-center gap-1.5 rounded-full px-3 py-2"
            style={{ backgroundColor: phase === 'scanning' ? '#1e2535' : ACCENT }}
            accessibilityRole="button"
          >
            {phase === 'locked' ? (
              <RefreshCw color="#0a0e18" size={12} />
            ) : (
              <ScanLine color={phase === 'scanning' ? '#8a90a6' : '#0a0e18'} size={12} />
            )}
            <Mono style={{ color: phase === 'scanning' ? '#8a90a6' : '#0a0e18' }}>
              {phase === 'locked' ? 'RESET' : phase === 'scanning' ? 'SCANNING' : 'SCAN'}
            </Mono>
          </Pressable>
        </View>
      </View>

      <View
        className="border-line mt-3 self-center overflow-hidden rounded-2xl border"
        style={{ width, height: boxHeight }}
      >
        <PalmCamera facing={facing} active={active} granted={granted} accent={ACCENT} />
        <PalmRig
          states={states}
          hand={hand}
          width={width}
          height={boxHeight}
          phase={phase}
          scan={scan}
          accent={ACCENT}
          selectedKey={reading?.dimmest ?? null}
          onSelectPoint={openPoint}
        />
        <PhaseHint phase={phase} />

        <View className="absolute bottom-2 left-2 flex-row gap-2">
          {(['left', 'right'] as const).map((h) => (
            <Pressable
              key={h}
              onPress={() => {
                setHand(h);
                tap();
              }}
              className="border-line/80 rounded-full border px-2.5 py-1.5"
              style={{
                backgroundColor: hand === h ? `${ACCENT}22` : '#0a0e18cc',
                borderColor: hand === h ? `${ACCENT}88` : '#1e2535',
              }}
              accessibilityRole="button"
              accessibilityLabel={`${h} hand`}
            >
              <Mono style={{ color: hand === h ? ACCENT : '#8a90a6' }}>
                {h === 'left' ? 'L' : 'R'}
              </Mono>
            </Pressable>
          ))}
          {granted ? (
            <Pressable
              onPress={() => {
                setFacing((f) => (f === 'front' ? 'back' : 'front'));
                tap();
              }}
              className="border-line/80 h-8 w-8 items-center justify-center rounded-full border"
              style={{ backgroundColor: '#0a0e18cc' }}
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
            >
              <RefreshCw color="#8a90a6" size={12} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {granted ? null : (
        <Pressable
          onPress={() => void requestPermission()}
          className="border-line mt-3 flex-row items-center justify-center gap-2 rounded-xl border py-3"
          accessibilityRole="button"
        >
          <Camera color={ACCENT} size={13} />
          <Mono style={{ color: ACCENT }}>ENABLE CAMERA</Mono>
        </Pressable>
      )}

      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Mono>PALM FIELD</Mono>
          <View className="mt-1 flex-row items-baseline">
            <Text className="font-mono-bold" style={{ fontSize: 30, color: ACCENT }}>
              {fieldIndex}
            </Text>
            <Text className="text-faint font-mono" style={{ fontSize: 12 }}>
              /100
            </Text>
          </View>
        </View>
        <View className="items-end">
          <Mono>CHANNEL CONTINUITY</Mono>
          <View className="mt-1 flex-row items-baseline">
            <Text className="text-ink font-mono-bold" style={{ fontSize: 22 }}>
              {continuity}
            </Text>
            <Text className="text-faint font-mono" style={{ fontSize: 11 }}>
              /100
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={phase === 'locked' ? analyze : startScan}
        className="mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
        style={{
          backgroundColor: phase === 'locked' ? ACCENT : 'transparent',
          borderWidth: phase === 'locked' ? 0 : 1,
          borderColor: '#1e2535',
        }}
        accessibilityRole="button"
      >
        <Text
          className="font-mono-bold"
          style={{ fontSize: 12, color: phase === 'locked' ? '#0a0e18' : '#8a90a6' }}
        >
          {phase === 'locked' ? 'ANALYZE PALM' : 'SCAN TO ANALYZE'}
        </Text>
      </Pressable>

      <Text className="text-faint mt-3" style={{ fontSize: 10, lineHeight: 15 }}>
        {PALM_DISCLAIMER}
      </Text>

      {reading ? (
        <SoftFade style={{ marginTop: 16 }}>
          <Panel className="p-4">
            <Mono className="text-body">PALM READING</Mono>
            <Display size={20} className="mt-1.5">
              {reading.headline}
            </Display>
            <Text
              className="text-mute mt-2"
              style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 }}
            >
              {reading.body}
            </Text>
          </Panel>
        </SoftFade>
      ) : null}

      <Mono className="mt-5">PALM POINTS · TAP TO INSPECT</Mono>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {points.map((p) => {
          const def = CHAKRA_BY_KEY[p.key];
          const energy = states.find((s) => s.key === p.key)?.energy ?? 50;
          return (
            <Pressable
              key={p.key}
              onPress={() => openPoint(p.key)}
              className="border-line rounded-xl border px-3 py-2.5"
              style={{ minWidth: 96, backgroundColor: '#111726' }}
              accessibilityRole="button"
            >
              <View className="flex-row items-center gap-1.5">
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: def.color }} />
                <Text className="text-faint font-mono" style={{ fontSize: 8, letterSpacing: 1 }}>
                  {def.name.split(' ')[0].toUpperCase()}
                </Text>
              </View>
              <Text className="font-mono-bold mt-1" style={{ fontSize: 16, color: def.color }}>
                {energy}
              </Text>
              <Text className="text-faint mt-0.5 font-mono" style={{ fontSize: 7.5 }}>
                {p.zone.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/mudras')}
        accessibilityRole="button"
        accessibilityLabel="Open Mudra Vision, camera hand alignment practice"
        className="mt-5"
      >
        <Panel className="flex-row items-center gap-3 p-3.5">
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}1f` }}>
            <Hand color={ACCENT} size={16} />
          </View>
          <View className="flex-1">
            <Mono style={{ color: ACCENT }}>PALM → MUDRA → PRACTICE</Mono>
            <Text className="text-mute mt-1" style={{ fontSize: 12, lineHeight: 17 }}>
              Take a mudra from the palm map into camera alignment practice.
            </Text>
          </View>
          <ChevronRight color="#565c72" size={16} />
        </Panel>
      </Pressable>

      {compare ? (
        <View className="mt-5">
          <Mono className="mb-2">PALM COMPARISON</Mono>
          {current && previous ? (
            <PalmCompare current={current} previous={previous} />
          ) : (
            <Panel className="p-4">
              <Text className="text-mute" style={{ fontSize: 12, lineHeight: 18 }}>
                {current
                  ? 'One scan saved. Analyze your palm again later to see the difference.'
                  : 'No scans saved yet. Lock the rig, then tap Analyze Palm.'}
              </Text>
            </Panel>
          )}
        </View>
      ) : null}
    </View>
  );
}
