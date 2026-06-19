import { Blur, Canvas, Circle, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useDerivedValue, type DerivedValue } from 'react-native-reanimated';
import { Text } from 'heroui-native';

import { CHAKRA_BY_KEY, CHAKRA_ORDER } from '@/lib/chakras';
import type { ChakraKey, ChakraState } from '@/lib/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBreath } from '@/hooks/useBreath';

interface BodyFieldProps {
  states: ChakraState[];
  width: number;
  onSelectNode: (key: ChakraKey) => void;
}

/** Vertical positions (0..1) of each node down the central channel. */
const NODE_Y: Record<ChakraKey, number> = {
  soul: 0.06,
  crown: 0.13,
  third: 0.21,
  throat: 0.31,
  heart: 0.44,
  solar: 0.57,
  sacral: 0.68,
  root: 0.79,
  earth: 0.92,
};

interface NodeView {
  key: ChakraKey;
  energy: number;
  cy: number;
  baseR: number;
  color: string;
}

function NodeBloom({
  node,
  cx,
  breath,
}: {
  node: NodeView;
  cx: number;
  breath: DerivedValue<number>;
}) {
  const r = useDerivedValue(
    () => node.baseR * (2.6 + breath.value * 0.5) * (0.6 + node.energy / 100),
  );
  return (
    <Circle cx={cx} cy={node.cy} r={r} opacity={0.22 + (node.energy / 100) * 0.18}>
      <RadialGradient
        c={vec(cx, node.cy)}
        r={node.baseR * 3.5}
        colors={[node.color, `${node.color}00`]}
      />
    </Circle>
  );
}

export function BodyField({ states, width, onSelectNode }: BodyFieldProps) {
  const height = Math.min(width * 1.5, 520);
  const cx = width / 2;
  const reduced = useReducedMotion();
  const breath = useBreath(reduced);

  const nodes = useMemo<NodeView[]>(
    () =>
      CHAKRA_ORDER.map((key) => {
        const state = states.find((s) => s.key === key);
        const energy = state?.energy ?? 50;
        const cy = NODE_Y[key] * height;
        const baseR = 9 + (energy / 100) * 13;
        return { key, energy, cy, baseR, color: CHAKRA_BY_KEY[key].color };
      }),
    [states, height],
  );

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {/* central channel dots */}
        <Group opacity={0.4}>
          {nodes.slice(0, -1).map((n, i) => {
            const next = nodes[i + 1];
            return (
              <Circle
                key={`line-${n.key}`}
                cx={cx}
                cy={(n.cy + next.cy) / 2}
                r={1.4}
                color="#2a3450"
              />
            );
          })}
        </Group>

        {/* glow blooms */}
        <Group layer>
          {nodes.map((n) => (
            <NodeBloom key={`bloom-${n.key}`} node={n} cx={cx} breath={breath} />
          ))}
          <Blur blur={8} />
        </Group>

        {/* node cores */}
        {nodes.map((n) => (
          <Group key={`core-${n.key}`}>
            <Circle cx={cx} cy={n.cy} r={n.baseR} color={n.color} opacity={0.95} />
            <Circle cx={cx} cy={n.cy} r={n.baseR * 0.45} color="#ffffff" opacity={0.7} />
          </Group>
        ))}
      </Canvas>

      {/* tap targets + labels */}
      {nodes.map((n) => {
        const chakra = CHAKRA_BY_KEY[n.key];
        const onLeft = ['crown', 'throat', 'solar', 'root'].includes(n.key);
        return (
          <Pressable
            key={`hit-${n.key}`}
            onPress={() => onSelectNode(n.key)}
            style={{
              position: 'absolute',
              top: n.cy - 22,
              left: 0,
              right: 0,
              height: 44,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 8,
                ...(onLeft ? { right: cx + n.baseR + 14 } : { left: cx + n.baseR + 14 }),
                alignItems: onLeft ? 'flex-end' : 'flex-start',
              }}
            >
              <Text className="text-faint font-mono" style={{ fontSize: 8, letterSpacing: 1 }}>
                {chakra.name.toUpperCase()} · {chakra.bija.toUpperCase()}
              </Text>
              <Text className="font-mono-bold" style={{ fontSize: 13, color: n.color }}>
                {n.energy}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
