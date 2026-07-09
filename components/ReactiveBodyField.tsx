/**
 * REACTIVE BODY FIELD — Frequency-Responsive Human Body Visualization
 *
 * Enhances the static body field with real-time frequency reactions:
 * - Active chakra glows based on current session frequency
 * - Breathing animation syncs with binaural beats  
 * - Multiple frequencies blend visually
 * - Color interpolation uses OKLab for smooth transitions
 * - Audio analysis drives particle density and motion
 */

import { Blur, Canvas, Circle, Group, RadialGradient, vec, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { useDerivedValue, useSharedValue, withTiming, withRepeat, type DerivedValue } from 'react-native-reanimated';
import { Text } from 'heroui-native';

import { CHAKRA_BY_KEY, CHAKRA_ORDER } from '@/lib/chakras';
import type { ChakraKey, ChakraState } from '@/lib/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useBreath } from '@/hooks/useBreath';
import { frequencyToColor, nearestChakra } from '@/lib/sound';
import { getAudioManager } from '@/lib/audio-engine';

interface ReactiveBodyFieldProps {
  states: ChakraState[];
  width: number;
  onSelectNode: (key: ChakraKey) => void;
  /** Currently active frequency (if any) */
  activeFrequency?: number;
  /** Binaural beat rate (if any) */
  beatHz?: number;
  /** Is audio currently playing */
  isPlaying?: boolean;
  /** Show frequency overlays */
  showFrequencyOverlay?: boolean;
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
  isActive: boolean;
  frequencyMatch: number; // 0-1 how well current frequency matches this chakra
}

/**
 * Enhanced node bloom that responds to frequency activity
 */
function ReactiveNodeBloom({
  node,
  cx,
  breath,
  frequencyPulse,
}: {
  node: NodeView;
  cx: number;
  breath: DerivedValue<number>;
  frequencyPulse: DerivedValue<number>;
}) {
  const r = useDerivedValue(() => {
    const breathScale = 2.6 + breath.value * 0.5;
    const energyScale = 0.6 + node.energy / 100;
    const frequencyScale = node.isActive ? (1 + frequencyPulse.value * 0.8) : 1;
    return node.baseR * breathScale * energyScale * frequencyScale;
  });
  
  const opacity = useDerivedValue(() => {
    const baseOpacity = 0.22 + (node.energy / 100) * 0.18;
    const frequencyBoost = node.isActive ? (0.3 + frequencyPulse.value * 0.4) : 0;
    return Math.min(0.8, baseOpacity + frequencyBoost);
  });

  // Blend frequency color with chakra color when active
  const activeColor = useMemo(() => {
    if (!node.isActive) return node.color;
    return frequencyToColor(CHAKRA_BY_KEY[node.key].solfeggioHz);
  }, [node.isActive, node.key, node.color]);

  return (
    <Circle cx={cx} cy={node.cy} r={r} opacity={opacity}>
      <RadialGradient
        c={vec(cx, node.cy)}
        r={useDerivedValue(() => node.baseR * 3.5)}
        colors={[activeColor, `${activeColor}00`]}
      />
    </Circle>
  );
}

/**
 * Energy flow particles that animate between chakras
 */
function EnergyFlow({
  nodes,
  cx,
  width,
  height,
  isActive,
  beatHz
}: {
  nodes: NodeView[];
  cx: number;
  width: number;
  height: number;
  isActive: boolean;
  beatHz?: number;
}) {
  const flowProgress = useSharedValue(0);
  
  useEffect(() => {
    if (isActive && beatHz) {
      // Sync flow with binaural beat frequency
      const cycleDuration = 1000 / beatHz * 4; // 4 beats per cycle
      flowProgress.value = withRepeat(
        withTiming(1, { duration: cycleDuration }),
        -1,
        false
      );
    } else {
      flowProgress.value = withTiming(0, { duration: 1000 });
    }
  }, [isActive, beatHz, flowProgress]);
  
  const flowPath = useDerivedValue(() => {
    if (!isActive) return Skia.Path.Make();
    
    const path = Skia.Path.Make();
    const progress = flowProgress.value;
    
    // Create flowing particles along the central channel
    for (let i = 0; i < nodes.length - 1; i++) {
      const currentNode = nodes[i];
      const nextNode = nodes[i + 1];
      
      // Calculate particle positions along the path
      const startY = currentNode.cy;
      const endY = nextNode.cy;
      const particleY = startY + (endY - startY) * progress;
      
      // Add particle
      const particleSize = 2 + Math.sin(progress * Math.PI) * 2;
      path.addCircle(cx, particleY, particleSize);
    }
    
    return path;
  });
  
  const activeColor = frequencyToColor(CHAKRA_BY_KEY.heart.solfeggioHz); // Default to heart color
  
  return (
    <Group opacity={isActive ? 0.6 : 0}>
      <Path
        path={flowPath}
        color={activeColor}
      />
    </Group>
  );
}

/**
 * Frequency resonance overlay showing which chakras are being activated
 */
function FrequencyOverlay({
  nodes,
  cx,
  width,
  height,
  activeFrequency,
  showOverlay
}: {
  nodes: NodeView[];
  cx: number;
  width: number;
  height: number;
  activeFrequency?: number;
  showOverlay?: boolean;
}) {
  if (!showOverlay || !activeFrequency) return null;
  
  const resonanceRings = useDerivedValue(() => {
    const path = Skia.Path.Make();
    
    nodes.forEach(node => {
      if (node.frequencyMatch > 0.3) { // Only show significant resonance
        const ringRadius = node.baseR * (2 + node.frequencyMatch * 2);
        path.addCircle(cx, node.cy, ringRadius);
      }
    });
    
    return path;
  });
  
  const resonanceColor = frequencyToColor(activeFrequency);
  
  return (
    <Group opacity={0.4}>
      <Path
        path={resonanceRings}
        color={resonanceColor}
        style="stroke"
        strokeWidth={1}
      />
    </Group>
  );
}

/**
 * Calculate how well a frequency resonates with each chakra
 */
function calculateFrequencyMatch(frequency: number, chakraKey: ChakraKey): number {
  const chakraHz = CHAKRA_BY_KEY[chakraKey].solfeggioHz;
  
  // Calculate resonance based on harmonic relationships
  const ratio = frequency / chakraHz;
  const octaveRatio = ratio >= 1 ? ratio : 1 / ratio;
  
  // Check for octave relationships (2:1, 4:1, etc.)
  const octaveLog = Math.log2(octaveRatio);
  const octaveDistance = Math.abs(octaveLog - Math.round(octaveLog));
  
  // Check for perfect fifth (3:2 ratio)
  const fifthDistance = Math.abs(Math.log(ratio) - Math.log(1.5));
  
  // Check for perfect fourth (4:3 ratio)  
  const fourthDistance = Math.abs(Math.log(ratio) - Math.log(4/3));
  
  // Calculate overall match (closer to 0 = better match)
  const minDistance = Math.min(octaveDistance, fifthDistance * 0.6, fourthDistance * 0.8);
  
  // Convert distance to match score (0-1)
  return Math.max(0, 1 - minDistance * 5);
}

export function ReactiveBodyField({ 
  states, 
  width, 
  onSelectNode, 
  activeFrequency, 
  beatHz,
  isPlaying = false,
  showFrequencyOverlay = false 
}: ReactiveBodyFieldProps) {
  const height = Math.min(width * 1.5, 520);
  const cx = width / 2;
  const reduced = useReducedMotion();
  
  // Breathing animation - sync with binaural beats if active
  const breathTempo = beatHz && isPlaying ? (60 / beatHz) * 1000 : 4000;
  const breath = useBreath(reduced || (!isPlaying), breathTempo);
  
  // Frequency pulse animation
  const frequencyPulse = useSharedValue(0);
  
  useEffect(() => {
    if (isPlaying && !reduced) {
      const pulseDuration = beatHz ? (1000 / beatHz) : 2000;
      frequencyPulse.value = withRepeat(
        withTiming(1, { duration: pulseDuration }),
        -1,
        true
      );
    } else {
      frequencyPulse.value = withTiming(0, { duration: 1000 });
    }
  }, [isPlaying, beatHz, reduced, frequencyPulse]);
  
  // Calculate which chakra is currently active and resonance matches
  const activeChakra = activeFrequency ? nearestChakra(activeFrequency) : null;
  
  const nodes = useMemo<NodeView[]>(() => {
    return CHAKRA_ORDER.map((key) => {
      const state = states.find((s) => s.key === key);
      const energy = state?.energy ?? 50;
      const cy = NODE_Y[key] * height;
      const baseR = 9 + (energy / 100) * 13;
      const isActive = activeChakra === key;
      const frequencyMatch = activeFrequency ? calculateFrequencyMatch(activeFrequency, key) : 0;
      
      return { 
        key, 
        energy, 
        cy, 
        baseR, 
        color: CHAKRA_BY_KEY[key].color,
        isActive,
        frequencyMatch
      };
    });
  }, [states, height, activeChakra, activeFrequency]);

  return (
    <View style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {/* Central channel dots */}
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

        {/* Energy flow particles */}
        <EnergyFlow
          nodes={nodes}
          cx={cx}
          width={width}
          height={height}
          isActive={isPlaying}
          beatHz={beatHz}
        />

        {/* Frequency resonance overlay */}
        <FrequencyOverlay
          nodes={nodes}
          cx={cx}
          width={width}
          height={height}
          activeFrequency={activeFrequency}
          showOverlay={showFrequencyOverlay}
        />

        {/* Enhanced glow blooms */}
        <Group layer>
          {nodes.map((n) => (
            <ReactiveNodeBloom 
              key={`bloom-${n.key}`} 
              node={n} 
              cx={cx} 
              breath={breath}
              frequencyPulse={frequencyPulse}
            />
          ))}
          <Blur blur={8} />
        </Group>

        {/* Node cores with enhanced active state */}
        {nodes.map((n) => {
          const coreOpacity = n.isActive ? 1.0 : 0.95;
          const innerOpacity = n.isActive ? 0.9 : 0.7;
          const coreColor = n.isActive ? frequencyToColor(activeFrequency!) : n.color;
          
          return (
            <Group key={`core-${n.key}`}>
              <Circle cx={cx} cy={n.cy} r={n.baseR} color={coreColor} opacity={coreOpacity} />
              <Circle cx={cx} cy={n.cy} r={n.baseR * 0.45} color="#ffffff" opacity={innerOpacity} />
            </Group>
          );
        })}
      </Canvas>

      {/* Tap targets + labels with frequency info */}
      {nodes.map((n) => {
        const chakra = CHAKRA_BY_KEY[n.key];
        const onLeft = ['crown', 'throat', 'solar', 'root'].includes(n.key);
        const showFreqInfo = n.isActive && activeFrequency;
        
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
              {showFreqInfo && (
                <Text 
                  className="font-mono" 
                  style={{ 
                    fontSize: 9, 
                    color: frequencyToColor(activeFrequency),
                    marginTop: 2,
                    opacity: 0.8
                  }}
                >
                  {activeFrequency} Hz
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}