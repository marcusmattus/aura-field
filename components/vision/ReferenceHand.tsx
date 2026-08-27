import { Blur, Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue, type DerivedValue } from 'react-native-reanimated';

import { SkiaGate } from '@/components/SkiaGate';
import { HandSkeleton } from '@/components/vision/HandSkeleton';
import { useBreath } from '@/hooks/useBreath';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FINGERS, FINGERTIP, HAND_LANDMARK_NAMES, type LandmarkSet } from '@/lib/vision/types';

/** Canonical landmarks span roughly x:[-0.65,0.65], y:[-1.35,0.35] (wrist at
 * origin, fingers pointing up). This maps that box into normalized 0..1
 * display space with even margin, right hand as authored, mirrored for left. */
function projectCanonical(landmarks: LandmarkSet, hand: 'left' | 'right'): LandmarkSet {
  const minX = -0.75;
  const maxX = 0.75;
  const minY = -1.45;
  const maxY = 0.4;
  const out = {} as LandmarkSet;
  for (const name of HAND_LANDMARK_NAMES) {
    const p = landmarks[name];
    const nx = (p.x - minX) / (maxX - minX);
    const ny = (p.y - minY) / (maxY - minY);
    out[name] = { x: hand === 'left' ? 1 - nx : nx, y: ny, z: p.z };
  }
  return out;
}

/**
 * The animated reference hand shown on the learning screen — the mudra's
 * target shape, with a gentle breathing pulse at each fingertip so it reads
 * as "alive" rather than a static diagram. The skeleton itself is always
 * static and legible; only the decorative pulse is disabled under Reduced
 * Motion, per spec §23.
 */
export function ReferenceHand({
  landmarks,
  hand,
  width,
  height,
  color,
}: {
  landmarks: LandmarkSet;
  hand: 'left' | 'right';
  width: number;
  height: number;
  color: string;
}) {
  const reduced = useReducedMotion();
  const breath = useBreath(reduced);
  const projected = useMemo(() => projectCanonical(landmarks, hand), [landmarks, hand]);

  return (
    <View style={{ width, height }}>
      <HandSkeleton
        landmarks={projected}
        width={width}
        height={height}
        color={color}
        opacity={0.92}
        strokeWidth={2.4}
        jointWidth={4.5}
      />
      {reduced ? null : (
        <FingertipPulse landmarks={projected} width={width} height={height} color={color} breath={breath} />
      )}
    </View>
  );
}

function FingertipPulse({
  landmarks,
  width,
  height,
  color,
  breath,
}: {
  landmarks: LandmarkSet;
  width: number;
  height: number;
  color: string;
  breath: DerivedValue<number>;
}) {
  return (
    <SkiaGate fallback={null}>
      <Canvas style={StyleSheet.absoluteFill}>
        {FINGERS.map((finger, i) => {
          const tip = landmarks[FINGERTIP[finger]];
          const cx = tip.x * width;
          const cy = tip.y * height;
          return <PulseDot key={finger} cx={cx} cy={cy} color={color} breath={breath} phase={i * 0.7} />;
        })}
      </Canvas>
    </SkiaGate>
  );
}

function PulseDot({
  cx,
  cy,
  color,
  breath,
  phase,
}: {
  cx: number;
  cy: number;
  color: string;
  breath: DerivedValue<number>;
  phase: number;
}) {
  const r = useDerivedValue(() => 7 + 4 * Math.sin(breath.value * Math.PI * 2 + phase));
  const opacity = useDerivedValue(() => 0.25 + 0.2 * Math.sin(breath.value * Math.PI * 2 + phase));
  return (
    <Circle cx={cx} cy={cy} r={r} opacity={opacity}>
      <RadialGradient c={vec(cx, cy)} r={16} colors={[color, `${color}00`]} />
      <Blur blur={3} />
    </Circle>
  );
}
