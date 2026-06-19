import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { CHAKRA_BY_KEY, CHAKRA_ORDER } from '@/lib/chakras';
import type { ChakraState } from '@/lib/types';

interface AuraSigilProps {
  states: ChakraState[];
  size: number;
}

/**
 * Radial nine-node graph — the field as a constellation/polygon. Node radius
 * from center scales with energy; same node colors as the body field.
 */
export function AuraSigil({ states, size }: AuraSigilProps) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.42;

  const points = useMemo(() => {
    return CHAKRA_ORDER.map((key, i) => {
      const angle = (i / CHAKRA_ORDER.length) * Math.PI * 2 - Math.PI / 2;
      const energy = states.find((s) => s.key === key)?.energy ?? 50;
      const r = maxR * (0.35 + (energy / 100) * 0.65);
      return {
        key,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        color: CHAKRA_BY_KEY[key].color,
        energy,
      };
    });
  }, [states, cx, cy, maxR]);

  const polygon = useMemo(() => {
    const p = Skia.Path.Make();
    points.forEach((pt, i) => {
      if (i === 0) p.moveTo(pt.x, pt.y);
      else p.lineTo(pt.x, pt.y);
    });
    p.close();
    return p;
  }, [points]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* faint reference rings */}
        <Group opacity={0.25}>
          {/* oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp */}
          <Circle cx={cx} cy={cy} r={maxR} style="stroke" strokeWidth={1} color="#1e2535" />
          {/* oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp */}
          <Circle cx={cx} cy={cy} r={maxR * 0.6} style="stroke" strokeWidth={1} color="#1e2535" />
        </Group>

        {/* spokes */}
        {/* oxlint-disable react/style-prop-object */}
        <Group opacity={0.3}>
          {points.map((pt) => (
            <Path
              key={`spoke-${pt.key}`}
              path={`M ${cx} ${cy} L ${pt.x} ${pt.y}`}
              color="#2a3450"
              style="stroke"
              strokeWidth={1}
            />
          ))}
        </Group>
        {/* oxlint-enable react/style-prop-object */}

        {/* aura polygon */}
        <Path path={polygon} color="#6b6bff" opacity={0.14} />
        {/* oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp */}
        <Path path={polygon} color="#8a90ff" style="stroke" strokeWidth={1.5} opacity={0.5} />

        {/* node points */}
        {points.map((pt) => (
          <Group key={`pt-${pt.key}`}>
            <Circle cx={pt.x} cy={pt.y} r={6 + (pt.energy / 100) * 4} color={pt.color} />
            <Circle cx={pt.x} cy={pt.y} r={2.5} color="#ffffff" opacity={0.8} />
          </Group>
        ))}

        {/* center */}
        <Circle cx={cx} cy={cy} r={3} color="#e9ecf5" opacity={0.6} />
      </Canvas>
    </View>
  );
}
