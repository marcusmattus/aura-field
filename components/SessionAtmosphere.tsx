import { Canvas, Circle, Group, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { AtmospherePreset } from '@/lib/frequency/atmosphere';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  atmosphere: AtmospherePreset;
  active: boolean;
};

type ParticleSeed = {
  x: number;
  y: number;
  r: number;
  phase: number;
  drift: number;
};

function fract(n: number): number {
  return n - Math.floor(n);
}

function hash(i: number, salt: number): number {
  return fract(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);
}

function Particle({
  seed,
  color,
  progress,
  float,
  width,
  height,
}: {
  seed: ParticleSeed;
  color: string;
  progress: SharedValue<number>;
  float: SharedValue<number>;
  width: number;
  height: number;
}) {
  const cx = useDerivedValue(() => {
    const wave = Math.sin((progress.value + seed.phase) * Math.PI * 2);
    return seed.x * width + wave * seed.drift * width * 0.04;
  });
  const cy = useDerivedValue(() => {
    const wave = Math.cos((progress.value + seed.phase) * Math.PI * 2);
    return seed.y * height + wave * seed.drift * height * 0.05 - float.value * height * 0.02;
  });
  const opacity = useDerivedValue(() => {
    const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((progress.value + seed.phase) * Math.PI * 2));
    return pulse * 0.55;
  });

  return <Circle cx={cx} cy={cy} r={seed.r} color={color} opacity={opacity} />;
}

export function SessionAtmosphereView({ atmosphere, active }: Props) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0.92);
  const progress = useSharedValue(0);
  const float = useSharedValue(0);
  const ripple = useSharedValue(0.2);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(progress);
    cancelAnimation(float);
    cancelAnimation(ripple);

    if (!active || reduceMotion) {
      breath.value = 0.96;
      progress.value = 0;
      float.value = 0;
      ripple.value = 0.45;
      return;
    }

    const still = atmosphere.motion === 'still';
    const duration = Math.max(900, Math.round(4200 / Math.max(atmosphere.motionScale, 0.2)));

    breath.value = withRepeat(
      withTiming(still ? 1.02 : 1.08, {
        duration: still ? duration * 2.2 : duration,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );
    progress.value = withRepeat(
      withTiming(1, {
        duration: Math.round(duration * (still ? 4 : 2.4)),
        easing: Easing.linear,
      }),
      -1,
      false
    );
    float.value = withRepeat(
      withTiming(1, {
        duration: Math.round(duration * (still ? 3 : 1.6)),
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
    ripple.value = withRepeat(
      withTiming(1, {
        duration: Math.max(700, Math.round(2600 / Math.max(atmosphere.motionScale, 0.25))),
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false
    );
  }, [active, atmosphere.motion, atmosphere.motionScale, breath, float, progress, reduceMotion, ripple]);

  const seeds = useMemo<ParticleSeed[]>(() => {
    const count = Math.max(0, atmosphere.particleCount);
    return Array.from({ length: count }, (_, index) => ({
      x: 0.08 + hash(index, 1) * 0.84,
      y: 0.1 + hash(index, 2) * 0.8,
      r: 1.4 + hash(index, 3) * 3.2,
      phase: hash(index, 4),
      drift: 0.35 + hash(index, 5) * 0.65,
    }));
  }, [atmosphere.particleCount]);

  const bloomR = useDerivedValue(() => Math.min(width, height) * 0.42 * breath.value * atmosphere.bloom);
  const glowR = useDerivedValue(() => Math.min(width, height) * 0.28 * breath.value);
  const auraR = useDerivedValue(() => Math.min(width, height) * 0.55 * breath.value);
  const waveR1 = useDerivedValue(() => Math.min(width, height) * (0.18 + ripple.value * 0.45));
  const waveR2 = useDerivedValue(
    () => Math.min(width, height) * (0.12 + ((ripple.value + 0.35) % 1) * 0.5)
  );
  const waveOpacity = useDerivedValue(() => (1 - ripple.value) * 0.45 * atmosphere.waveStrength);

  const minimal = atmosphere.uiMode === 'minimal';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, height)}
            colors={[atmosphere.backgroundTop, atmosphere.backgroundBottom]}
          />
        </Rect>

        <Group>
          <Circle
            cx={width / 2}
            cy={height * 0.4}
            r={auraR}
            color={atmosphere.glow}
            opacity={(minimal ? 0.12 : 0.14) * atmosphere.aura}
          />
          {atmosphere.uiMode === 'warm' ? (
            <Circle
              cx={width / 2}
              cy={height * 0.55}
              r={Math.min(width, height) * 0.7}
              color={atmosphere.accent}
              opacity={0.08}
            />
          ) : null}
          {!minimal ? (
            <>
              <Circle
                cx={width / 2}
                cy={height * 0.4}
                r={bloomR}
                color={atmosphere.accent}
                opacity={0.2 * atmosphere.bloom}
              />
              <Circle
                cx={width / 2}
                cy={height * 0.4}
                r={glowR}
                color={atmosphere.glow}
                opacity={0.35}
              />
            </>
          ) : null}
        </Group>

        {atmosphere.waveStrength > 0.2 ? (
          <Group>
            {/* oxlint-disable react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp */}
            <Circle
              cx={width / 2}
              cy={height * 0.42}
              r={waveR1}
              color={atmosphere.accent}
              style="stroke"
              strokeWidth={2.2}
              opacity={waveOpacity}
            />
            <Circle
              cx={width / 2}
              cy={height * 0.42}
              r={waveR2}
              color={atmosphere.glow}
              style="stroke"
              strokeWidth={1.4}
              opacity={waveOpacity}
            />
            {/* oxlint-enable react/style-prop-object */}
          </Group>
        ) : null}

        {!minimal && atmosphere.particleCount > 0
          ? seeds.map((seed) => (
              <Particle
                key={`p-${seed.x.toFixed(4)}-${seed.y.toFixed(4)}-${seed.phase.toFixed(4)}`}
                seed={seed}
                color={atmosphere.particle}
                progress={progress}
                float={float}
                width={width}
                height={height}
              />
            ))
          : null}
      </Canvas>
    </View>
  );
}
