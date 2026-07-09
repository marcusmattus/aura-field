/**
 * FREQUENCY VISUALIZER — Real-time Audio-Reactive Orb
 * 
 * Central visual component that responds to live audio analysis.
 * Completely procedural - no hardcoded colors or animations.
 * Everything derives from frequency and real-time audio data.
 */

import { Canvas, Circle, Group, Path, Skia, Blur, RadialGradient, vec } from '@shopify/react-native-skia';
import { useMemo, useEffect } from 'react';
import { View } from 'react-native';
import { useDerivedValue, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

import { useBreath } from '@/hooks/useBreath';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { ColorPalette, VisualizationParameters } from '@/lib/frequency';

interface FrequencyVisualizerProps {
  size: number;
  colors: ColorPalette;
  visualization: VisualizationParameters;
  /** Audio analyser for real-time frequency data */
  analyser?: AnalyserNode | null;
  playing: boolean;
  /** Real-time frequency (can change during session) */
  currentFrequency?: number;
}

interface AudioData {
  frequencies: Float32Array;
  waveform: Float32Array;
  volume: number;
  dominantFrequency: number;
}

/**
 * Hook to extract real-time audio data from AnalyserNode
 */
function useAudioAnalysis(analyser?: AnalyserNode | null, playing?: boolean): SharedValue<AudioData> {
  const audioData = useSharedValue<AudioData>({
    frequencies: new Float32Array(0),
    waveform: new Float32Array(0),
    volume: 0,
    dominantFrequency: 0
  });

  useEffect(() => {
    if (!analyser || !playing) {
      audioData.value = {
        frequencies: new Float32Array(0),
        waveform: new Float32Array(0),
        volume: 0,
        dominantFrequency: 0
      };
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const frequencies = new Float32Array(bufferLength);
    const waveform = new Float32Array(bufferLength);
    
    let animationId: number;

    const updateAudioData = () => {
      try {
        // Get frequency domain data
        analyser.getFloatFrequencyData(frequencies);
        
        // Get time domain data for waveform
        analyser.getFloatTimeDomainData(waveform);
        
        // Calculate volume (RMS)
        let sum = 0;
        for (let i = 0; i < waveform.length; i++) {
          sum += waveform[i] * waveform[i];
        }
        const volume = Math.sqrt(sum / waveform.length);
        
        // Find dominant frequency
        let maxValue = -Infinity;
        let maxIndex = 0;
        for (let i = 0; i < frequencies.length; i++) {
          if (frequencies[i] > maxValue) {
            maxValue = frequencies[i];
            maxIndex = i;
          }
        }
        
        const sampleRate = 44100; // Assuming standard sample rate
        const dominantFrequency = (maxIndex * sampleRate) / (2 * frequencies.length);
        
        audioData.value = {
          frequencies: new Float32Array(frequencies),
          waveform: new Float32Array(waveform),
          volume: Math.min(1, volume * 10), // Amplify for visibility
          dominantFrequency
        };
      } catch (error) {
        console.warn('Audio analysis error:', error);
      }
      
      animationId = requestAnimationFrame(updateAudioData);
    };

    updateAudioData();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [analyser, playing, audioData]);

  return audioData;
}

/**
 * Dynamic particle system that responds to audio
 */
function AudioParticles({ 
  size, 
  colors, 
  audioData, 
  particleDensity 
}: { 
  size: number; 
  colors: ColorPalette; 
  audioData: SharedValue<AudioData>;
  particleDensity: number;
}) {
  const particleCount = Math.round(particleDensity * 32);
  const cx = size / 2;
  const cy = size / 2;
  
  const particlePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const { volume, frequencies } = audioData.value;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      
      // Use frequency data to modulate particle positions
      const freqIndex = Math.floor((i / particleCount) * frequencies.length);
      const freqValue = frequencies[freqIndex] || -60;
      const normalizedFreq = Math.max(0, (freqValue + 60) / 60); // Convert dB to 0-1
      
      const baseRadius = size * 0.25;
      const radius = baseRadius + (normalizedFreq * volume * size * 0.15);
      
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      
      const particleSize = Math.max(1, volume * normalizedFreq * 4);
      
      path.addCircle(x, y, particleSize);
    }
    
    return path;
  }, [audioData, particleCount, cx, cy, size]);
  
  return (
    <Group opacity={0.6}>
      <Path 
        path={particlePath} 
        color={colors.ring}
      />
    </Group>
  );
}

/**
 * Central orb that pulses with audio and breath
 */
function CentralOrb({ 
  size, 
  colors, 
  audioData, 
  breathPulse, 
  orbScale 
}: { 
  size: number; 
  colors: ColorPalette; 
  audioData: SharedValue<AudioData>;
  breathPulse: SharedValue<number>;
  orbScale: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  
  const baseRadius = size * 0.12 * orbScale;
  
  const orbRadius = useDerivedValue(() => {
    const { volume } = audioData.value;
    const breathScale = 1 + breathPulse.value * 0.3;
    const audioScale = 1 + volume * 0.4;
    return baseRadius * breathScale * audioScale;
  }, [audioData, breathPulse, baseRadius]);
  
  const glowRadius = useDerivedValue(() => orbRadius.value * 2.5, [orbRadius]);
  
  return (
    <Group>
      {/* Outer glow */}
      <Circle 
        cx={cx} 
        cy={cy} 
        r={glowRadius} 
        opacity={0.2}
      >
        <RadialGradient
          c={vec(cx, cy)}
          r={glowRadius.value}
          colors={[colors.core, 'transparent']}
        />
      </Circle>
      
      {/* Main orb */}
      <Circle 
        cx={cx} 
        cy={cy} 
        r={orbRadius} 
        color={colors.core}
        opacity={0.8}
      />
      
      {/* Inner core */}
      <Circle 
        cx={cx} 
        cy={cy} 
        r={useDerivedValue(() => orbRadius.value * 0.3)} 
        color={colors.primary}
        opacity={0.9}
      />
    </Group>
  );
}

/**
 * Frequency rings that expand and contract
 */
function FrequencyRings({ 
  size, 
  colors, 
  rings, 
  audioData, 
  glow 
}: { 
  size: number; 
  colors: ColorPalette; 
  rings: number;
  audioData: SharedValue<AudioData>;
  glow: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  
  const ringRadii = useMemo(() => {
    const count = Math.max(1, Math.round(rings));
    return Array.from({ length: count }, (_, i) => {
      const progress = i / (count - 1 || 1);
      return 0.2 + progress * 0.25; // Relative radii from 20% to 45%
    });
  }, [rings]);
  
  return (
    <Group opacity={0.3 + glow * 0.4}>
      {ringRadii.map((relativeRadius, index) => {
        const ringRadius = useDerivedValue(() => {
          const { volume, frequencies } = audioData.value;
          const baseRadius = size * relativeRadius;
          
          // Each ring responds to different frequency bands
          const bandIndex = Math.floor((index / ringRadii.length) * frequencies.length);
          const bandValue = frequencies[bandIndex] || -60;
          const normalizedBand = Math.max(0, (bandValue + 60) / 60);
          
          return baseRadius * (1 + volume * normalizedBand * 0.2);
        }, [audioData, size, relativeRadius, index]);
        
        return (
          <Circle
            key={index}
            cx={cx}
            cy={cy}
            r={ringRadius}
            style="stroke"
            strokeWidth={1 + glow * 2}
            color={colors.ring}
            opacity={0.6 - index * 0.1}
          />
        );
      })}
    </Group>
  );
}

/**
 * Main frequency visualizer component
 */
export function FrequencyVisualizer({
  size,
  colors,
  visualization,
  analyser,
  playing,
  currentFrequency
}: FrequencyVisualizerProps) {
  const reduced = useReducedMotion();
  const breathPulse = useBreath(reduced || !playing, visualization.tempoS * 1000);
  const audioData = useAudioAnalysis(analyser, playing);
  
  // Motion intensity animation
  const motionIntensity = useSharedValue(0);
  
  useEffect(() => {
    if (playing && !reduced) {
      motionIntensity.value = withRepeat(
        withTiming(visualization.motionIntensity, { duration: visualization.tempoS * 1000 }),
        -1,
        true
      );
    } else {
      motionIntensity.value = withTiming(0, { duration: 1000 });
    }
  }, [playing, reduced, visualization.motionIntensity, visualization.tempoS, motionIntensity]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {/* Blur effect for mystical appearance */}
          <Group>
            <Blur blur={1} />
            
            {/* Frequency rings */}
            <FrequencyRings
              size={size}
              colors={colors}
              rings={visualization.rings}
              audioData={audioData}
              glow={visualization.glow}
            />
            
            {/* Audio-reactive particles */}
            <AudioParticles
              size={size}
              colors={colors}
              audioData={audioData}
              particleDensity={visualization.particleDensity}
            />
            
            {/* Central orb */}
            <CentralOrb
              size={size}
              colors={colors}
              audioData={audioData}
              breathPulse={breathPulse}
              orbScale={visualization.orbScale}
            />
          </Group>
        </Group>
      </Canvas>
    </View>
  );
}