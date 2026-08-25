import {
  Blur,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  Path,
  RadialGradient,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Check, PenLine, Play, Square, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type DerivedValue,
} from 'react-native-reanimated';
import { Text } from 'heroui-native';

import { buildPalmOutlinePath } from '@/components/palm/palmPath';
import { Display, Mono, Panel } from '@/components/ui';
import { useBreath } from '@/hooks/useBreath';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { MUDRAS, MUDRA_BY_KEY, mudraSessionsFor } from '@/lib/mudras';
import { palmPointsFor } from '@/lib/palm';
import { useSkiaReady } from '@/lib/skia';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

type Stage = 'setup' | 'holding' | 'done';

function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(style);
}

function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function GatherPoint({
  cx,
  cy,
  color,
  breath,
  index,
}: {
  cx: number;
  cy: number;
  color: string;
  breath: DerivedValue<number>;
  index: number;
}) {
  const phase = index * 0.9;
  const r = useDerivedValue(() => 22 + 6 * Math.sin(breath.value * Math.PI * 2 + phase));
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} opacity={0.4}>
        <RadialGradient c={vec(cx, cy)} r={34} colors={[color, `${color}00`]} />
      </Circle>
      <Circle cx={cx} cy={cy} r={5} color={color} opacity={0.95} />
    </Group>
  );
}

/** The reference hand shape plus the palm points the mudra gathers toward. */
function MudraGuide(props: {
  width: number;
  height: number;
  accent: string;
  gathers: ChakraKey[];
}) {
  const skiaReady = useSkiaReady();
  if (!skiaReady) return null;
  return <MudraGuideCanvas {...props} />;
}

function MudraGuideCanvas({
  width,
  height,
  accent,
  gathers,
}: {
  width: number;
  height: number;
  accent: string;
  gathers: ChakraKey[];
}) {
  const reduced = useReducedMotion();
  const breath = useBreath(reduced);
  const outline = useMemo(() => buildPalmOutlinePath('right', width, height), [width, height]);
  const points = useMemo(
    () => palmPointsFor('right').filter((p) => gathers.includes(p.key)),
    [gathers],
  );

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Path path={outline} style="stroke" strokeWidth={1.4} color={accent} opacity={0.38}>
        <DashPathEffect intervals={[10, 8]} />
      </Path>
      <Group layer>
        {points.map((p, i) => (
          <GatherPoint
            key={p.key}
            cx={p.x * width}
            cy={p.y * height}
            color={CHAKRA_BY_KEY[p.key].color}
            breath={breath}
            index={i}
          />
        ))}
        <Blur blur={5} />
      </Group>
    </Canvas>
  );
}

function HoldRing(props: { progress: DerivedValue<number>; color: string; size: number }) {
  const skiaReady = useSkiaReady();
  if (!skiaReady) return <View style={{ width: props.size, height: props.size }} />;
  return <HoldRingCanvas {...props} />;
}

function HoldRingCanvas({
  progress,
  color,
  size,
}: {
  progress: DerivedValue<number>;
  color: string;
  size: number;
}) {
  const ring = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(size / 2, size / 2, size / 2 - 4);
    return p;
  }, [size]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path
        path={ring}
        style="stroke"
        strokeWidth={3}
        color="#1e2535"
        start={0}
        end={1}
        opacity={0.9}
      />
      <Path
        path={ring}
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={color}
        start={0}
        end={progress}
      />
    </Canvas>
  );
}

/**
 * Mudra hold session. The camera mirrors the user's hand beside the reference
 * shape; chakraOS times the hold and records it against the node so the field —
 * and therefore Palm Field — moves. No form checking, no frame analysis.
 */
export default function MudraSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ key: string }>();
  const mudra = (params.key ? MUDRA_BY_KEY[params.key] : undefined) ?? MUDRAS[0];
  const def = CHAKRA_BY_KEY[mudra.chakra];

  const completeMudra = useChakraStore((s) => s.completeMudra);
  const sessions = useChakraStore((s) => s.sessions);
  const states = useChakraStore((s) => s.states);
  const energy = states.find((s) => s.key === mudra.chakra)?.energy ?? 50;
  const holds = mudraSessionsFor(mudra.chakra, sessions).length;

  const [permission, requestPermission] = useCameraPermissions();
  const granted = permission?.granted ?? false;

  const [stage, setStage] = useState<Stage>('setup');
  const [duration, setDuration] = useState<number>(mudra.holds[0]);
  const [remaining, setRemaining] = useState<number>(mudra.holds[0]);
  const progress = useSharedValue(0);
  const finishedRef = useRef(false);

  const boxHeight = 320;
  const { width: screenWidth } = useWindowDimensions();
  const guideWidth = Math.max(220, screenWidth - 40);

  useEffect(() => {
    if (stage !== 'holding') return undefined;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'holding' || remaining > 0 || finishedRef.current) return;
    finishedRef.current = true;
    completeMudra({ mudraKey: mudra.key, chakra: mudra.chakra, durationS: duration });
    setStage('done');
    tap(Haptics.ImpactFeedbackStyle.Medium);
  }, [stage, remaining, completeMudra, mudra.key, mudra.chakra, duration]);

  useEffect(() => {
    if (stage === 'holding') {
      cancelAnimation(progress);
      progress.value = 0;
      progress.value = withTiming(1, { duration: duration * 1000, easing: Easing.linear });
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [stage, duration, progress]);

  const begin = () => {
    finishedRef.current = false;
    setRemaining(duration);
    setStage('holding');
    tap();
  };

  const stop = () => {
    finishedRef.current = false;
    setRemaining(duration);
    setStage('setup');
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: def.color }}>
              MUDRA · {def.name.toUpperCase()} · {def.solfeggioHz} HZ
            </Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>

          <View className="mt-2 flex-row items-baseline gap-2">
            <Display size={32} color={def.color}>
              {mudra.name}
            </Display>
            <Text className="text-faint" style={{ fontSize: 15 }}>
              {mudra.sanskrit}
            </Text>
          </View>
          <Text
            className="text-mute mt-1"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 }}
          >
            {mudra.intent}
          </Text>

          <View
            className="border-line mt-4 overflow-hidden rounded-2xl border"
            style={{ height: boxHeight }}
          >
            {granted ? (
              <View style={StyleSheet.absoluteFill}>
                <CameraView style={StyleSheet.absoluteFill} facing="front" />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05060ab8' }]} />
              </View>
            ) : (
              <LinearGradient
                colors={['#0d1424', '#0a0e18', '#080b13']}
                style={StyleSheet.absoluteFill}
              />
            )}
            <MudraGuide
              width={guideWidth}
              height={boxHeight}
              accent={def.color}
              gathers={mudra.gathers}
            />
            <View
              className="absolute right-3 bottom-3 left-3 rounded-lg px-3 py-2"
              style={{ backgroundColor: '#05060acc' }}
            >
              <Text className="text-ink text-center" style={{ fontSize: 12, lineHeight: 18 }}>
                {stage === 'holding' ? mudra.cue : 'Line your hand up with the outline.'}
              </Text>
            </View>
          </View>

          {granted ? null : (
            <Pressable
              onPress={() => void requestPermission()}
              className="border-line mt-3 flex-row items-center justify-center gap-2 rounded-xl border py-3"
              accessibilityRole="button"
            >
              <Camera color={def.color} size={13} />
              <Mono style={{ color: def.color }}>ENABLE CAMERA</Mono>
            </Pressable>
          )}

          {stage === 'setup' ? (
            <View className="mt-5">
              <Mono>HOLD LENGTH</Mono>
              <View className="mt-2 flex-row gap-2">
                {mudra.holds.map((h) => {
                  const on = duration === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => {
                        setDuration(h);
                        setRemaining(h);
                        tap();
                      }}
                      className="border-line flex-1 items-center rounded-xl border py-2.5"
                      style={{
                        borderColor: on ? `${def.color}99` : '#1e2535',
                        backgroundColor: on ? `${def.color}1a` : 'transparent',
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <Mono style={{ color: on ? def.color : '#8a90a6' }}>
                        {Math.round(h / 60)} MIN
                      </Mono>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={begin}
                className="mt-3 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
                style={{ backgroundColor: def.color }}
                accessibilityRole="button"
              >
                <Play color="#0a0e18" size={14} fill="#0a0e18" />
                <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                  BEGIN HOLD
                </Text>
              </Pressable>
            </View>
          ) : null}

          {stage === 'holding' ? (
            <View className="mt-5 flex-row items-center gap-4">
              <View className="items-center justify-center" style={{ width: 92, height: 92 }}>
                <HoldRing progress={progress} color={def.color} size={92} />
                <View className="absolute items-center">
                  <Text className="font-mono-bold" style={{ fontSize: 18, color: def.color }}>
                    {clock(remaining)}
                  </Text>
                  <Mono size={8}>LEFT</Mono>
                </View>
              </View>
              <View className="flex-1">
                <Mono>HOLDING · {def.name.toUpperCase()}</Mono>
                <Text className="text-mute mt-1.5" style={{ fontSize: 12, lineHeight: 18 }}>
                  Keep the shape loose. If the hand aches, soften it — the hold matters more than
                  the precision.
                </Text>
                <Pressable
                  onPress={stop}
                  className="border-line mt-3 flex-row items-center justify-center gap-2 self-start rounded-xl border px-4 py-2.5"
                  accessibilityRole="button"
                >
                  <Square color="#8a90a6" size={11} fill="#8a90a6" />
                  <Mono>STOP</Mono>
                </Pressable>
              </View>
            </View>
          ) : null}

          {stage === 'done' ? (
            <View className="mt-5">
              <Panel className="p-4">
                <View className="flex-row items-center gap-2">
                  <Check color={def.color} size={14} />
                  <Mono style={{ color: def.color }}>HOLD COMPLETE</Mono>
                </View>
                <Text
                  className="text-ink mt-2"
                  style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 }}
                >
                  {Math.round(duration / 60)} minutes of {mudra.name} filed against {def.name}. The
                  field has been recomputed — your {def.name.toLowerCase()} point now reads {energy}
                  , and Palm Field will draw it that way on your next scan.
                </Text>
                <Text
                  className="text-faint mt-2 font-mono"
                  style={{ fontSize: 8.5, letterSpacing: 1 }}
                >
                  {holds} TOTAL HOLD{holds === 1 ? '' : 'S'} · {def.name.toUpperCase()}
                </Text>
              </Panel>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
                  style={{ backgroundColor: def.color }}
                  onPress={() => {
                    close();
                    router.navigate({
                      pathname: '/(tabs)/journal',
                      params: { seed: mudra.chakra },
                    });
                  }}
                  accessibilityRole="button"
                >
                  <PenLine color="#0a0e18" size={14} />
                  <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                    REFLECT ON IT
                  </Text>
                </Pressable>
                <Pressable
                  className="border-line items-center justify-center rounded-xl border px-5 py-3.5"
                  onPress={close}
                  accessibilityRole="button"
                >
                  <Mono>DONE</Mono>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Mono className="mt-6">THE SHAPE</Mono>
          <View className="mt-2 gap-2">
            {mudra.steps.map((step, i) => (
              <View key={step} className="flex-row gap-3">
                <Text
                  className="font-mono-bold"
                  style={{ fontSize: 11, color: def.color, width: 14 }}
                >
                  {i + 1}
                </Text>
                <Text className="text-mute flex-1" style={{ fontSize: 13, lineHeight: 20 }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          <Text className="text-faint mt-6" style={{ fontSize: 10, lineHeight: 15 }}>
            The camera is a mirror so you can see your own hand. chakraOS times the hold and folds
            it into the field like a frequency session — it does not analyse the image or grade your
            form.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
