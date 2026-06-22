import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useBreath } from '@/hooks/useBreath';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SoundVisualizerProps {
  size: number;
  /** center bloom color — derived `palette.core` (frequencyToColor(baseHz)) */
  core: string;
  /** radiating bars/rings color — derived `palette.ring` (the fifth-up accent) */
  ring: string;
  /** ring density — derived from the brainwave band (`band.rings`) */
  rings?: number;
  /** breath period in seconds — derived from the band (`band.tempoS`) */
  tempoS?: number;
  /** glow spread 0..1 — derived from the band (`band.soft`) */
  soft?: number;
  playing: boolean;
}

const BAR_COUNT = 64;

function Bars({ size, color, pulse }: { size: number; color: string; pulse: SharedValue<number> }) {
  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.2;

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    for (let i = 0; i < BAR_COUNT; i++) {
      const angle = (i / BAR_COUNT) * Math.PI * 2;
      const wave = Math.sin(i * 0.7 + pulse.value * Math.PI * 2);
      const len = innerR * (0.25 + (wave * 0.5 + 0.5) * 0.55);
      const x1 = cx + Math.cos(angle) * innerR;
      const y1 = cy + Math.sin(angle) * innerR;
      const x2 = cx + Math.cos(angle) * (innerR + len);
      const y2 = cy + Math.sin(angle) * (innerR + len);
      p.moveTo(x1, y1);
      p.lineTo(x2, y2);
    }
    return p;
  });

  // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
  return <Path path={path} color={color} style="stroke" strokeWidth={2} strokeCap="round" />;
}

/**
 * Radial Skia visualizer. Everything it draws is derived: `core`/`ring` colors
 * come from `frequencyToColor`, ring count + tempo + glow come from the
 * brainwave band. No hardcoded colors, no per-session branches.
 */
export function SoundVisualizer({
  size,
  core,
  ring,
  rings = 3,
  tempoS = 4.2,
  soft = 0.6,
  playing,
}: SoundVisualizerProps) {
  const reduced = useReducedMotion();
  const pulse = useBreath(reduced || !playing, tempoS * 1000);
  const cx = size / 2;
  const cy = size / 2;

  const ringR = useDerivedValue(() => size * 0.14 * (1 + pulse.value * 0.25));

  // ring radii spread by band density — more rings = tighter, brighter field
  const ringRadii = useMemo(() => {
    const count = Math.max(1, Math.round(rings));
    const lo = 0.26;
    const hi = 0.46;
    return Array.from({ length: count }, (_, i) =>
      count === 1 ? (lo + hi) / 2 : lo + ((hi - lo) * i) / (count - 1),
    );
  }, [rings]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* oxlint-disable react/style-prop-object */}
        <Group opacity={0.18 + soft * 0.22}>
          {ringRadii.map((r) => (
            <Circle
              key={r}
              cx={cx}
              cy={cy}
              r={size * r}
              style="stroke"
              strokeWidth={1}
              color={ring}
            />
          ))}
        </Group>
        {/* oxlint-enable react/style-prop-object */}

        <Bars size={size} color={ring} pulse={pulse} />

        <Group>
          <Circle cx={cx} cy={cy} r={size * 0.18} color={core} opacity={0.16 + soft * 0.16} />
          <Circle cx={cx} cy={cy} r={ringR} color={core} opacity={0.5} />
          <Circle cx={cx} cy={cy} r={size * 0.045} color={core} opacity={0.95} />
        </Group>
      </Canvas>
    </View>
  );
}
