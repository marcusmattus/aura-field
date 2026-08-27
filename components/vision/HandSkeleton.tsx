import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { SkiaGate } from '@/components/SkiaGate';
import { FINGERS, FINGER_JOINTS, type FingerKey, type HandLandmarkName, type LandmarkSet } from '@/lib/vision/types';

export interface DisplayLandmarks {
  landmarks: LandmarkSet;
  /** normalized (0..1) landmark space -> pixel box */
  width: number;
  height: number;
}

const PALM_BASE: readonly HandLandmarkName[] = [
  'thumbCmc',
  'indexMcp',
  'middleMcp',
  'ringMcp',
  'pinkyMcp',
];

function scoreColor(score: number): string {
  if (score >= 85) return '#3ddc97';
  if (score >= 55) return '#e8b23d';
  return '#ff5c5c';
}

/**
 * Draws a hand skeleton (bones + joints) from a landmark set already placed
 * in normalized (0..1) box space. Used for both the live user overlay and
 * the reference "ghost hand" — the caller decides opacity/color/quality.
 */
export function HandSkeleton({
  landmarks,
  width,
  height,
  color = '#36d6e7',
  opacity = 1,
  strokeWidth = 2.2,
  jointWidth = 4,
  /** per-finger 0-100 match quality — when provided, bones/joints are
   * colored per finger instead of `color` (spec §12: "highlight mismatched
   * joints"). */
  fingerQuality,
}: DisplayLandmarks & {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  jointWidth?: number;
  fingerQuality?: Partial<Record<FingerKey, number>>;
}) {
  return (
    <SkiaGate fallback={null}>
      <HandSkeletonCanvas
        landmarks={landmarks}
        width={width}
        height={height}
        color={color}
        opacity={opacity}
        strokeWidth={strokeWidth}
        jointWidth={jointWidth}
        fingerQuality={fingerQuality}
      />
    </SkiaGate>
  );
}

function HandSkeletonCanvas({
  landmarks,
  width,
  height,
  color,
  opacity,
  strokeWidth,
  jointWidth,
  fingerQuality,
}: DisplayLandmarks & {
  color: string;
  opacity: number;
  strokeWidth: number;
  jointWidth: number;
  fingerQuality?: Partial<Record<FingerKey, number>>;
}) {
  const fingerPaths = useMemo(() => {
    const px = (name: HandLandmarkName) => ({
      x: landmarks[name].x * width,
      y: landmarks[name].y * height,
    });
    return FINGERS.map((finger) => {
      const joints = FINGER_JOINTS[finger];
      const path = Skia.Path.Make();
      joints.forEach((name, i) => {
        const p = px(name);
        if (i === 0) path.moveTo(p.x, p.y);
        else path.lineTo(p.x, p.y);
      });
      return { finger, path };
    });
  }, [landmarks, width, height]);

  const palmPath = useMemo(() => {
    const px = (name: HandLandmarkName) => ({
      x: landmarks[name].x * width,
      y: landmarks[name].y * height,
    });
    const path = Skia.Path.Make();
    PALM_BASE.forEach((name, i) => {
      const p = px(name);
      if (i === 0) path.moveTo(p.x, p.y);
      else path.lineTo(p.x, p.y);
    });
    return path;
  }, [landmarks, width, height]);

  const px = (name: HandLandmarkName) => ({
    x: landmarks[name].x * width,
    y: landmarks[name].y * height,
  });

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group opacity={opacity}>
        {/* oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp */}
        <Path path={palmPath} style="stroke" strokeWidth={strokeWidth} strokeCap="round" color={color} opacity={0.55} />
        {fingerPaths.map(({ finger, path }) => (
          <Path
            key={finger}
            path={path}
            // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
            style="stroke"
            strokeWidth={strokeWidth}
            strokeCap="round"
            strokeJoin="round"
            color={fingerQuality ? scoreColor(fingerQuality[finger] ?? 100) : color}
          />
        ))}
        {FINGERS.map((finger) =>
          FINGER_JOINTS[finger]
            .slice(1)
            .map((name) => {
              const p = px(name);
              return (
                <Circle
                  key={name}
                  cx={p.x}
                  cy={p.y}
                  r={jointWidth}
                  color={fingerQuality ? scoreColor(fingerQuality[finger] ?? 100) : color}
                />
              );
            }),
        )}
        <Circle cx={px('wrist').x} cy={px('wrist').y} r={jointWidth * 1.2} color={color} />
      </Group>
    </Canvas>
  );
}
