import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useBreath } from '@/hooks/useBreath';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface SoundVisualizerProps {
  size: number;
  color: string;
  /** 0..1 playback progress, drives ring expansion */
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

/** Radial Skia visualizer reacting to playback (synthesized envelope). */
export function SoundVisualizer({ size, color, playing }: SoundVisualizerProps) {
  const reduced = useReducedMotion();
  const pulse = useBreath(reduced || !playing);
  const cx = size / 2;
  const cy = size / 2;

  const ringR = useDerivedValue(() => size * 0.14 * (1 + pulse.value * 0.25));

  const rings = useMemo(() => [0.28, 0.34, 0.41], []);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* oxlint-disable react/style-prop-object */}
        <Group opacity={0.3}>
          {rings.map((r) => (
            <Circle
              key={r}
              cx={cx}
              cy={cy}
              r={size * r}
              style="stroke"
              strokeWidth={1}
              color={color}
            />
          ))}
        </Group>
        {/* oxlint-enable react/style-prop-object */}

        <Bars size={size} color={color} pulse={pulse} />

        <Group>
          <Circle cx={cx} cy={cy} r={size * 0.18} color={color} opacity={0.18} />
          <Circle cx={cx} cy={cy} r={ringR} color={color} opacity={0.5} />
          <Circle cx={cx} cy={cy} r={size * 0.04} color="#ffffff" opacity={0.85} />
        </Group>
      </Canvas>
    </View>
  );
}
