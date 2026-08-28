import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { DerivedValue } from 'react-native-reanimated';
import { Text } from 'heroui-native';

import { SkiaGate } from '@/components/SkiaGate';
import { Mono } from '@/components/ui';

export const HOLD_DURATIONS = [30, 60, 120, 300] as const;

function clock(total: number): string {
  const m = Math.floor(total / 60);
  const s = Math.max(0, Math.floor(total % 60));
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function HoldRingCanvas({
  progress,
  color,
  size,
  paused,
}: {
  progress: DerivedValue<number>;
  color: string;
  size: number;
  paused: boolean;
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
        // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
        style="stroke"
        strokeWidth={3}
        color="#1e2535"
        opacity={0.9}
      />
      <Path
        path={ring}
        // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
        style="stroke"
        strokeWidth={3}
        strokeCap="round"
        color={paused ? '#565c72' : color}
        start={0}
        end={progress}
      />
    </Canvas>
  );
}

export function HoldRing({
  progress,
  color,
  size,
  remaining,
  paused,
}: {
  progress: DerivedValue<number>;
  color: string;
  size: number;
  remaining: number;
  paused: boolean;
}) {
  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <SkiaGate fallback={<View style={StyleSheet.absoluteFill} />}>
        <HoldRingCanvas progress={progress} color={color} size={size} paused={paused} />
      </SkiaGate>
      <View className="absolute items-center">
        <Text className="font-mono-bold" style={{ fontSize: 18, color: paused ? '#8a90a6' : color }}>
          {clock(remaining)}
        </Text>
        <Mono size={8}>{paused ? 'PAUSED' : 'LEFT'}</Mono>
      </View>
    </View>
  );
}

export function DurationPicker({
  value,
  onChange,
  accent,
  custom,
}: {
  value: number;
  onChange: (seconds: number) => void;
  accent: string;
  /** an already-chosen custom duration, shown as a fifth option when set */
  custom?: number;
}) {
  const options = custom && !HOLD_DURATIONS.includes(custom as (typeof HOLD_DURATIONS)[number])
    ? [...HOLD_DURATIONS, custom]
    : HOLD_DURATIONS;
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((h) => {
        const on = value === h;
        return (
          <Pressable
            key={h}
            onPress={() => onChange(h)}
            className="border-line flex-1 items-center rounded-xl border py-2.5"
            style={{
              minWidth: 64,
              borderColor: on ? `${accent}99` : '#1e2535',
              backgroundColor: on ? `${accent}1a` : 'transparent',
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Mono style={{ color: on ? accent : '#8a90a6' }}>
              {h < 60 ? `${h}S` : `${Math.round(h / 60)} MIN`}
            </Mono>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One dot per attempt taken this session — filled once that attempt cleared
 * the alignment threshold. */
export function AttemptDots({
  attempts,
  accent,
}: {
  attempts: { cleared: boolean }[];
  accent: string;
}) {
  if (attempts.length === 0) return null;
  return (
    <View className="flex-row items-center gap-1.5">
      {attempts.map((a, i) => (
        // oxlint-disable-next-line react/no-array-index-key -- attempts are append-only for the session's lifetime
        <View
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: a.cleared ? accent : '#1e2535' }}
        />
      ))}
    </View>
  );
}
