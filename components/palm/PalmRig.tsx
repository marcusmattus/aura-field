import {
  Blur,
  Canvas,
  Circle,
  DashPathEffect,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Skia,
  vec,
  type SkPath,
} from '@shopify/react-native-skia';
import { Crosshair } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type DerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text } from 'heroui-native';

import { useBreath } from '@/hooks/useBreath';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { buildPalmOutlinePath } from '@/components/palm/palmPath';
import { SkiaGate } from '@/components/SkiaGate';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { palmPointsFor, segmentStrengths, type PalmPoint } from '@/lib/palm';
import type { ChakraKey, ChakraState, PalmHand } from '@/lib/types';

export type PalmPhase = 'aligning' | 'scanning' | 'locked';

interface PalmRigProps {
  states: ChakraState[];
  hand: PalmHand;
  width: number;
  height: number;
  phase: PalmPhase;
  /** 0 while aligning, animates to 1 as the rig locks on */
  scan: SharedValue<number>;
  accent: string;
  selectedKey?: ChakraKey | null;
  onSelectPoint: (key: ChakraKey) => void;
}

interface RigNode extends PalmPoint {
  cx: number;
  cy: number;
  baseR: number;
  color: string;
  energy: number;
  /** reveal threshold along the scan sweep */
  at: number;
}

/** Reveal factor for one element along the scan sweep, 0..1. */
function useReveal(scan: SharedValue<number>, at: number): DerivedValue<number> {
  return useDerivedValue(() => {
    const raw = (scan.value - at * 0.82) * 7;
    return raw < 0 ? 0 : raw > 1 ? 1 : raw;
  });
}

function NodeBloom({
  node,
  breath,
  scan,
}: {
  node: RigNode;
  breath: DerivedValue<number>;
  scan: SharedValue<number>;
}) {
  const reveal = useReveal(scan, node.at);
  const r = useDerivedValue(
    () => node.baseR * (2.2 + breath.value * 0.6) * (0.55 + node.energy / 100),
  );
  const opacity = useDerivedValue(() => reveal.value * (0.16 + (node.energy / 100) * 0.22));
  return (
    <Circle cx={node.cx} cy={node.cy} r={r} opacity={opacity}>
      <RadialGradient
        c={vec(node.cx, node.cy)}
        r={node.baseR * 3.2}
        colors={[node.color, `${node.color}00`]}
      />
    </Circle>
  );
}

function NodeCore({
  node,
  breath,
  scan,
  index,
}: {
  node: RigNode;
  breath: DerivedValue<number>;
  scan: SharedValue<number>;
  index: number;
}) {
  const reveal = useReveal(scan, node.at);
  const phase = index * 0.72;
  const r = useDerivedValue(
    () =>
      node.baseR * (1 + 0.14 * (node.energy / 100) * Math.sin(breath.value * Math.PI * 2 + phase)),
  );
  const opacity = useDerivedValue(() => reveal.value * 0.95);
  const innerOpacity = useDerivedValue(() => reveal.value * 0.75);
  return (
    <Group>
      <Circle cx={node.cx} cy={node.cy} r={r} color={node.color} opacity={opacity} />
      <Circle
        cx={node.cx}
        cy={node.cy}
        r={node.baseR * 0.4}
        color="#ffffff"
        opacity={innerOpacity}
      />
    </Group>
  );
}

function ChannelSegment({
  path,
  color,
  strength,
  at,
  scan,
}: {
  path: SkPath;
  color: string;
  strength: number;
  at: number;
  scan: SharedValue<number>;
}) {
  const reveal = useReveal(scan, at);
  const opacity = useDerivedValue(() => reveal.value * (0.2 + strength * 0.55));
  return (
    <Path
      path={path}
      // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
      style="stroke"
      strokeWidth={0.8 + strength * 2.2}
      strokeCap="round"
      color={color}
      opacity={opacity}
    />
  );
}

/**
 * The living palm overlay. Draws the alignment contour, the nine chakraOS palm
 * points and the channel between them, and lets the user drag, rotate and pinch
 * the whole rig so it stays anchored to their hand as they move it.
 */
export function PalmRig(props: PalmRigProps) {
  return (
    <SkiaGate fallback={<View style={{ width: props.width, height: props.height }} />}>
      <PalmRigCanvas {...props} />
    </SkiaGate>
  );
}

function PalmRigCanvas({
  states,
  hand,
  width,
  height,
  phase,
  scan,
  accent,
  selectedKey,
  onSelectPoint,
}: PalmRigProps) {
  const reduced = useReducedMotion();
  const breath = useBreath(reduced);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const zoom = useSharedValue(1);

  const nodes = useMemo<RigNode[]>(() => {
    const points = palmPointsFor(hand);
    return points.map((p, i) => {
      const energy = states.find((s) => s.key === p.key)?.energy ?? 50;
      return {
        ...p,
        energy,
        cx: p.x * width,
        cy: p.y * height,
        baseR: 5.5 + (energy / 100) * 6.5,
        color: CHAKRA_BY_KEY[p.key].color,
        at: i / points.length,
      };
    });
  }, [hand, states, width, height]);

  const outline = useMemo(() => buildPalmOutlinePath(hand, width, height), [hand, width, height]);

  const segments = useMemo(() => {
    const strengths = segmentStrengths(states);
    return nodes.slice(0, -1).map((n, i) => {
      const next = nodes[i + 1];
      const path = Skia.Path.Make();
      path.moveTo(n.cx, n.cy);
      const mx = (n.cx + next.cx) / 2;
      const my = (n.cy + next.cy) / 2;
      const dx = next.cx - n.cx;
      const dy = next.cy - n.cy;
      const len = Math.hypot(dx, dy) || 1;
      const bow = 7 * (i % 2 === 0 ? 1 : -1);
      path.quadTo(mx + (-dy / len) * bow, my + (dx / len) * bow, next.cx, next.cy);
      return { key: n.key, path, color: n.color, strength: strengths[i] ?? 0.4, at: n.at };
    });
  }, [nodes, states]);

  const rigTransform = useDerivedValue(() => [
    { translateX: tx.value },
    { translateY: ty.value },
    { scale: zoom.value },
    { rotate: rot.value },
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: zoom.value },
      { rotate: `${rot.value}rad` },
    ],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rot.value}rad` }, { scale: 1 / zoom.value }],
  }));

  const outlineOpacity = useDerivedValue(() => 0.24 + (1 - scan.value) * 0.3 + breath.value * 0.1);
  const fillOpacity = useDerivedValue(() => 0.05 + scan.value * 0.06);
  const sweepTransform = useDerivedValue(() => [{ translateY: scan.value * height }]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(8)
      .onChange((e) => {
        tx.value += e.changeX;
        ty.value += e.changeY;
      });
    const pinch = Gesture.Pinch().onChange((e) => {
      zoom.value = Math.min(2.8, Math.max(0.65, zoom.value * e.scaleChange));
    });
    const rotate = Gesture.Rotation().onChange((e) => {
      rot.value += e.rotationChange;
    });
    return Gesture.Simultaneous(pan, pinch, rotate);
  }, [tx, ty, zoom, rot]);

  const recenter = () => {
    tx.value = withSpring(0, { damping: 18 });
    ty.value = withSpring(0, { damping: 18 });
    rot.value = withSpring(0, { damping: 18 });
    zoom.value = withSpring(1, { damping: 18 });
  };

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ width, height }}>
        <Canvas style={{ width, height }}>
          <Group transform={rigTransform} origin={vec(width / 2, height / 2)}>
            <Path path={outline} opacity={fillOpacity}>
              <RadialGradient
                c={vec(width / 2, height * 0.5)}
                r={width * 0.7}
                colors={[accent, `${accent}00`]}
              />
            </Path>
            <Path
              path={outline}
              // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
              style="stroke"
              strokeWidth={1.4}
              color={accent}
              opacity={outlineOpacity}
            >
              {phase === 'aligning' ? <DashPathEffect intervals={[9, 7]} /> : null}
            </Path>

            {segments.map((seg) => (
              <ChannelSegment
                key={`seg-${seg.key}`}
                path={seg.path}
                color={seg.color}
                strength={seg.strength}
                at={seg.at}
                scan={scan}
              />
            ))}

            <Group layer>
              {nodes.map((n) => (
                <NodeBloom key={`bloom-${n.key}`} node={n} breath={breath} scan={scan} />
              ))}
              <Blur blur={7} />
            </Group>

            {nodes.map((n, i) => (
              <NodeCore key={`core-${n.key}`} node={n} index={i} breath={breath} scan={scan} />
            ))}

            {selectedKey
              ? nodes
                  .filter((n) => n.key === selectedKey)
                  .map((n) => (
                    <Circle
                      key={`ring-${n.key}`}
                      cx={n.cx}
                      cy={n.cy}
                      r={n.baseR + 9}
                      // oxlint-disable-next-line react/style-prop-object -- Skia style prop is a string enum, not RN StyleProp
                      style="stroke"
                      strokeWidth={1.2}
                      color={n.color}
                      opacity={0.8}
                    />
                  ))
              : null}
          </Group>

          {phase === 'scanning' ? (
            <Group transform={sweepTransform}>
              <Rect x={0} y={-46} width={width} height={92}>
                <LinearGradient
                  start={vec(0, -46)}
                  end={vec(0, 46)}
                  colors={[`${accent}00`, `${accent}44`, `${accent}00`]}
                />
              </Rect>
              <Rect x={0} y={0} width={width} height={1.4} color={accent} opacity={0.8} />
            </Group>
          ) : null}
        </Canvas>

        <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]} pointerEvents="box-none">
          {phase === 'locked'
            ? nodes.map((n) => {
                const chakra = CHAKRA_BY_KEY[n.key];
                const onLeft = n.x < 0.5;
                return (
                  <Pressable
                    key={`hit-${n.key}`}
                    onPress={() => onSelectPoint(n.key)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`${chakra.name} palm point, energy ${n.energy}`}
                    style={{
                      position: 'absolute',
                      left: n.cx - 22,
                      top: n.cy - 22,
                      width: 44,
                      height: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Animated.View
                      style={[
                        labelStyle,
                        {
                          position: 'absolute',
                          width: 96,
                          alignItems: onLeft ? 'flex-end' : 'flex-start',
                          [onLeft ? 'right' : 'left']: 24,
                        },
                      ]}
                      pointerEvents="none"
                    >
                      <Text
                        className="font-mono"
                        style={{
                          fontSize: 7,
                          letterSpacing: 0.9,
                          color: '#c9cfe0',
                          textShadowColor: '#05060a',
                          textShadowRadius: 4,
                        }}
                      >
                        {chakra.name.split(' ')[0].toUpperCase()}
                      </Text>
                      <Text
                        className="font-mono-bold"
                        style={{
                          fontSize: 11,
                          color: n.color,
                          textShadowColor: '#05060a',
                          textShadowRadius: 4,
                        }}
                      >
                        {n.energy}
                      </Text>
                    </Animated.View>
                  </Pressable>
                );
              })
            : null}
        </Animated.View>

        {phase === 'locked' ? (
          <Pressable
            onPress={recenter}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Recenter palm rig"
            className="border-line/80 absolute right-2 bottom-2 h-9 w-9 items-center justify-center rounded-full border"
            style={{ backgroundColor: '#0a0e18cc' }}
          >
            <Crosshair color={accent} size={14} />
          </Pressable>
        ) : null}
      </View>
    </GestureDetector>
  );
}
