import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Check, PenLine, Play, RotateCcw, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { AttemptDots, DurationPicker, HoldRing } from '@/components/vision/HoldPanel';
import { CameraErrorBanner } from '@/components/vision/CameraErrorBanner';
import { CoachingHUD } from '@/components/vision/CoachingHUD';
import { FormMatchPanel } from '@/components/vision/FormMatchPanel';
import { HandSkeleton } from '@/components/vision/HandSkeleton';
import { computeFormMatch, type FormMatchResult } from '@/lib/vision/MudraAlignment';
import { useMudraVisionStore } from '@/lib/vision/mudraAlignmentStore';
import { MUDRA_BY_KEY, MUDRAS, referenceHandPoseFor, referencePoseFor } from '@/lib/vision/MudraRegistry';
import { applyFrameTransform, computeFrameTransform } from '@/lib/vision/PoseNormalizer';
import { SimulatedPoseSource } from '@/lib/vision/PoseSource';
import { useHandTrackingEngine } from '@/lib/vision/useHandTrackingEngine';
import type { Handedness } from '@/lib/vision/types';

const ACCENT = '#36d6e7';
const ALIGN_THRESHOLD = 85;
const RESUME_THRESHOLD = 80;
const DROP_THRESHOLD = 72;

type Stage = 'setup' | 'aligning' | 'holding' | 'attemptComplete' | 'sessionComplete';

function tap(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(style);
}

function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.max(0, total % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const NEUTRAL_TRANSFORM = { scale: 0.17, rotationDeg: 0, originX: 0.5, originY: 0.56 };

/**
 * Mudra Vision camera — the full core loop: hand tracking, ghost-hand
 * alignment, real-time coaching, timed hold, attempt-by-attempt recording,
 * completion, XP, and a hand-off into Journal for reflection.
 *
 * Hand landmarks are produced by lib/vision/PoseSource.ts's
 * SimulatedPoseSource — see that file's header. No camera frame is read,
 * uploaded, or stored anywhere in this screen or the pipeline underneath it.
 */
export default function MudraCameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mudra: string; hand?: string }>();
  const mudra = (params.mudra ? MUDRA_BY_KEY[params.mudra] : undefined) ?? MUDRAS[0];
  const isFocused = useIsFocused();
  const { width: screenWidth } = useWindowDimensions();

  const [hand, setHand] = useState<Handedness>(params.hand === 'left' ? 'left' : 'right');
  const [permission, requestPermission] = useCameraPermissions();
  const granted = permission?.granted ?? false;

  const [stage, setStage] = useState<Stage>('setup');
  const [duration, setDuration] = useState(mudra.recommendedDuration);
  const [remaining, setRemaining] = useState(mudra.recommendedDuration);
  const [paused, setPaused] = useState(false);
  const [attempts, setAttempts] = useState<FormMatchResult[]>([]);
  const [lastResult, setLastResult] = useState<FormMatchResult | null>(null);
  const progress = useSharedValue(0);

  const referencePose = useMemo(() => referencePoseFor(mudra), [mudra]);
  const referenceHandPose = useMemo(() => referenceHandPoseFor(mudra, hand), [mudra, hand]);

  // Deliberately not recreated on "practice again": the same tracked hand
  // stays in front of the camera between attempts, so the pose source keeps
  // running rather than resetting its convergence animation from scratch.
  const source = useMemo(() => new SimulatedPoseSource(mudra, { hand }), [mudra, hand]);
  const active = isFocused && stage !== 'setup' && stage !== 'sessionComplete';
  const { frame } = useHandTrackingEngine(source, active);

  const result: FormMatchResult | null = useMemo(() => {
    if (frame.status !== 'tracking' || !frame.pose) return null;
    return computeFormMatch(frame.pose, referenceHandPose, referencePose.tolerance);
  }, [frame, referenceHandPose, referencePose.tolerance]);

  const boxHeight = 360;
  const guideWidth = Math.max(220, screenWidth - 40);

  const ghostLandmarks = useMemo(() => {
    const t = frame.pose ? computeFrameTransform(frame.pose.rawLandmarks) : NEUTRAL_TRANSFORM;
    return applyFrameTransform(referencePose.landmarks, t);
  }, [frame.pose, referencePose.landmarks]);

  // Ghost-hand convergence -> automatic hold start once threshold is met.
  useEffect(() => {
    if (stage !== 'aligning' || !result) return;
    if (result.overall >= ALIGN_THRESHOLD) {
      setStage('holding');
      setRemaining(duration);
      setPaused(false);
      tap(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [stage, result, duration]);

  // Monitor alignment during the hold; pause the timer if it drops — or if
  // tracking is lost outright (spec §10/§24: never keep counting down blind).
  useEffect(() => {
    if (stage !== 'holding') return;
    if (!result) {
      if (!paused) setPaused(true);
      return;
    }
    if (paused && result.overall >= RESUME_THRESHOLD) setPaused(false);
    else if (!paused && result.overall < DROP_THRESHOLD) setPaused(true);
  }, [stage, result, paused]);

  // Countdown.
  useEffect(() => {
    if (stage !== 'holding' || paused) return undefined;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [stage, paused]);

  useEffect(() => {
    if (stage === 'holding') {
      cancelAnimation(progress);
      if (!paused) {
        const target = Math.min(1, (duration - remaining + 1) / duration);
        progress.value = withTiming(target, { duration: 1000, easing: Easing.linear });
      }
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
  }, [stage, paused, remaining, duration, progress]);

  useEffect(() => {
    if (stage !== 'holding' || remaining > 0) return;
    const finalResult = result ?? {
      overall: 0,
      fingerScores: [],
      contactScores: [],
      palmRotationScore: 0,
      palmRotationDiffDeg: 0,
      spacingScore: 0,
      corrections: [],
      topCorrections: [],
    };
    setAttempts((prev) => [...prev, finalResult]);
    setLastResult(finalResult);
    setStage('attemptComplete');
    tap(Haptics.ImpactFeedbackStyle.Medium);
  }, [stage, remaining, result]);

  const completeMudraSession = useMudraVisionStore((s) => s.completeSession);
  const [xpAwarded, setXpAwarded] = useState(0);

  const practiceAgain = () => {
    setStage('aligning');
    setRemaining(duration);
    setPaused(false);
    tap();
  };

  const finishSession = async () => {
    const { xpAwarded: xp } = await completeMudraSession({
      mudraKey: mudra.key,
      hand,
      durationS: duration * attempts.length,
      attempts,
    });
    setXpAwarded(xp);
    setStage('sessionComplete');
    tap(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/mudras');
  };

  const start = () => {
    setRemaining(duration);
    setAttempts([]);
    setStage('aligning');
    tap();
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: ACCENT }}>
              MUDRA VISION · {mudra.name.toUpperCase()}
            </Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>

          <View
            className="border-line mt-3 overflow-hidden rounded-2xl border"
            style={{ height: boxHeight }}
          >
            {granted ? (
              <View style={StyleSheet.absoluteFill}>
                <CameraView style={StyleSheet.absoluteFill} facing="front" />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05060ab8' }]} />
              </View>
            ) : (
              <LinearGradient colors={['#0d1424', '#0a0e18', '#080b13']} style={StyleSheet.absoluteFill} />
            )}

            {stage !== 'setup' ? (
              <>
                <HandSkeleton
                  landmarks={ghostLandmarks}
                  width={guideWidth}
                  height={boxHeight}
                  color={ACCENT}
                  opacity={0.35}
                  strokeWidth={2}
                />
                {frame.pose ? (
                  <HandSkeleton
                    landmarks={frame.pose.rawLandmarks}
                    width={guideWidth}
                    height={boxHeight}
                    fingerQuality={
                      result
                        ? Object.fromEntries(result.fingerScores.map((f) => [f.finger, f.score]))
                        : undefined
                    }
                  />
                ) : null}
                <CameraErrorBanner status={frame.status} />

                {result ? (
                  <View className="absolute top-3 right-3 items-end">
                    <Mono>FORM MATCH</Mono>
                    <Text
                      className="font-mono-bold"
                      style={{
                        fontSize: 26,
                        color: result.overall >= 85 ? '#3ddc97' : result.overall >= 55 ? '#e8b23d' : '#ff5c5c',
                      }}
                    >
                      {result.overall}
                    </Text>
                  </View>
                ) : null}

                {stage === 'holding' ? (
                  <View className="absolute top-3 left-3">
                    <HoldRing progress={progress} color={ACCENT} size={72} remaining={remaining} paused={paused} />
                  </View>
                ) : null}

                <View className="absolute right-3 bottom-3 left-3">
                  {result ? <CoachingHUD corrections={result.topCorrections} /> : null}
                </View>
              </>
            ) : (
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-faint text-center" style={{ fontSize: 12, lineHeight: 18 }}>
                  Line your hand up with the reference outline once you start.
                </Text>
              </View>
            )}
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

          {stage === 'setup' ? (
            <View className="mt-5">
              <Mono>HOLD LENGTH</Mono>
              <View className="mt-2">
                <DurationPicker
                  value={duration}
                  onChange={setDuration}
                  accent={ACCENT}
                  custom={mudra.recommendedDuration}
                />
              </View>
              <View className="mt-3 flex-row gap-2">
                {(['left', 'right'] as const).map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setHand(h)}
                    className="border-line flex-1 items-center rounded-xl border py-2.5"
                    style={{
                      borderColor: hand === h ? `${ACCENT}99` : '#1e2535',
                      backgroundColor: hand === h ? `${ACCENT}1a` : 'transparent',
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: hand === h }}
                  >
                    <Mono style={{ color: hand === h ? ACCENT : '#8a90a6' }}>{h.toUpperCase()} HAND</Mono>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={start}
                className="mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
                style={{ backgroundColor: ACCENT }}
                accessibilityRole="button"
              >
                <Play color="#0a0e18" size={14} fill="#0a0e18" />
                <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                  START TRACKING
                </Text>
              </Pressable>
            </View>
          ) : null}

          {stage === 'aligning' ? (
            <View className="mt-4">
              <Text className="text-mute text-center" style={{ fontSize: 12, lineHeight: 18 }}>
                Move your hand until the live skeleton overlaps the reference. The hold begins
                automatically at {ALIGN_THRESHOLD}+ form match.
              </Text>
              <View className="mt-3 items-center">
                <AttemptDots attempts={attempts.map((a) => ({ cleared: a.overall >= ALIGN_THRESHOLD }))} accent={ACCENT} />
              </View>
            </View>
          ) : null}

          {stage === 'attemptComplete' && lastResult ? (
            <View className="mt-4">
              <Panel className="p-4">
                <View className="flex-row items-center gap-2">
                  <Check color={ACCENT} size={14} />
                  <Mono style={{ color: ACCENT }}>
                    ATTEMPT {attempts.length.toString().padStart(2, '0')} COMPLETE
                  </Mono>
                </View>
                <View className="mt-3">
                  <FormMatchPanel result={lastResult} accent={ACCENT} />
                </View>
              </Panel>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  onPress={practiceAgain}
                  className="border-line flex-1 flex-row items-center justify-center gap-2 rounded-xl border py-3.5"
                  accessibilityRole="button"
                >
                  <RotateCcw color="#8a90a6" size={13} />
                  <Mono>PRACTICE AGAIN</Mono>
                </Pressable>
                <Pressable
                  onPress={() => void finishSession()}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
                  style={{ backgroundColor: ACCENT }}
                  accessibilityRole="button"
                >
                  <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                    COMPLETE SESSION
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {stage === 'sessionComplete' ? (
            <View className="mt-4">
              <Panel className="p-4">
                <Mono style={{ color: ACCENT }}>MUDRA SESSION COMPLETE</Mono>
                <Display size={22} className="mt-1.5">
                  {clock(duration * attempts.length)}
                </Display>
                <View className="mt-3 flex-row items-center justify-between">
                  <View>
                    <Mono>FORM MATCH</Mono>
                    <Text className="font-mono-bold mt-1" style={{ fontSize: 26, color: '#3ddc97' }}>
                      {attempts[attempts.length - 1]?.overall ?? 0}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Mono>XP</Mono>
                    <Text className="font-mono-bold mt-1" style={{ fontSize: 26, color: '#e8b23d' }}>
                      +{xpAwarded}
                    </Text>
                  </View>
                </View>
              </Panel>
              <View className="mt-3 flex-row gap-3">
                <Pressable
                  onPress={() => {
                    close();
                    router.navigate({
                      pathname: '/(tabs)/journal',
                      params: { seed: mudra.traditionalAssociations.chakras[0] ?? '' },
                    });
                  }}
                  className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
                  style={{ backgroundColor: ACCENT }}
                  accessibilityRole="button"
                >
                  <PenLine color="#0a0e18" size={14} />
                  <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                    REFLECT ON IT
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    router.replace({ pathname: '/mudras/compare', params: { mudra: mudra.key } })
                  }
                  className="border-line items-center justify-center rounded-xl border px-5 py-3.5"
                  accessibilityRole="button"
                >
                  <Mono>COMPARE</Mono>
                </Pressable>
              </View>
            </View>
          ) : null}

          <Text className="text-faint mt-6" style={{ fontSize: 10, lineHeight: 15 }}>
            Hand landmarks are processed on this device only. No camera frame is uploaded, stored,
            or sent to any AI model.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
