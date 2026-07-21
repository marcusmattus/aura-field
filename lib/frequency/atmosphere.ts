import { FREQUENCY_COLOR_ANCHORS } from '@/lib/frequency/color';
import type { ChakraKey } from '@/lib/types';

export type AtmosphereMotion =
  | 'breath-slow'
  | 'pulse-medium'
  | 'breath-gentle'
  | 'ripple-fast'
  | 'pulse-fast'
  | 'still';

export type AtmospherePreset = {
  key: ChakraKey;
  backgroundTop: string;
  backgroundBottom: string;
  glow: string;
  accent: string;
  particle: string;
  control: string;
  label: string;
  motion: AtmosphereMotion;
  /** Breath/pulse period scale. Lower = slower. */
  motionScale: number;
  particleCount: number;
  waveStrength: number;
  bloom: number;
  aura: number;
  uiMode: 'rich' | 'warm' | 'minimal';
};

function anchorHex(key: ChakraKey): string {
  const hit = FREQUENCY_COLOR_ANCHORS.find((a) => a.key === key);
  return hit?.hex ?? '#FFFFFF';
}

const PRESETS: Record<ChakraKey, AtmospherePreset> = {
  earth: {
    key: 'earth',
    backgroundTop: '#0A0404',
    backgroundBottom: '#140606',
    glow: anchorHex('earth'),
    accent: '#E86A5C',
    particle: 'rgba(192,67,58,0.55)',
    control: anchorHex('earth'),
    label: '#F2C4BF',
    motion: 'breath-slow',
    motionScale: 0.55,
    particleCount: 28,
    waveStrength: 0.15,
    bloom: 0.85,
    aura: 0.9,
    uiMode: 'rich',
  },
  root: {
    key: 'root',
    backgroundTop: '#0C0406',
    backgroundBottom: '#1A070A',
    glow: anchorHex('root'),
    accent: '#FF7A88',
    particle: 'rgba(255,77,94,0.5)',
    control: anchorHex('root'),
    label: '#FFD0D5',
    motion: 'breath-slow',
    motionScale: 0.65,
    particleCount: 22,
    waveStrength: 0.2,
    bloom: 0.8,
    aura: 0.85,
    uiMode: 'rich',
  },
  sacral: {
    key: 'sacral',
    backgroundTop: '#120804',
    backgroundBottom: '#1C0E06',
    glow: anchorHex('sacral'),
    accent: '#FFB06A',
    particle: 'rgba(255,138,61,0.45)',
    control: anchorHex('sacral'),
    label: '#FFE0C4',
    motion: 'pulse-medium',
    motionScale: 0.85,
    particleCount: 20,
    waveStrength: 0.25,
    bloom: 0.75,
    aura: 0.8,
    uiMode: 'warm',
  },
  solar: {
    key: 'solar',
    backgroundTop: '#120E04',
    backgroundBottom: '#1A1406',
    glow: anchorHex('solar'),
    accent: '#FFE28A',
    particle: 'rgba(255,210,61,0.4)',
    control: anchorHex('solar'),
    label: '#FFF2C4',
    motion: 'pulse-medium',
    motionScale: 1,
    particleCount: 18,
    waveStrength: 0.3,
    bloom: 1,
    aura: 0.95,
    uiMode: 'warm',
  },
  heart: {
    key: 'heart',
    backgroundTop: '#04120C',
    backgroundBottom: '#061A12',
    glow: anchorHex('heart'),
    accent: '#7CFFC4',
    particle: 'rgba(54,245,166,0.5)',
    control: anchorHex('heart'),
    label: '#C9FFE8',
    motion: 'breath-gentle',
    motionScale: 0.75,
    particleCount: 34,
    waveStrength: 0.2,
    bloom: 0.7,
    aura: 1,
    uiMode: 'rich',
  },
  throat: {
    key: 'throat',
    backgroundTop: '#030A12',
    backgroundBottom: '#061422',
    glow: anchorHex('throat'),
    accent: '#7DD4FF',
    particle: 'rgba(61,182,255,0.35)',
    control: anchorHex('throat'),
    label: '#C6EBFF',
    motion: 'ripple-fast',
    motionScale: 1.55,
    particleCount: 12,
    waveStrength: 1,
    bloom: 0.55,
    aura: 0.7,
    uiMode: 'rich',
  },
  third: {
    key: 'third',
    backgroundTop: '#070712',
    backgroundBottom: '#0E0E22',
    glow: anchorHex('third'),
    accent: '#9A9AFF',
    particle: 'rgba(107,107,255,0.45)',
    control: '#9B6BFF',
    label: '#D4D4FF',
    motion: 'pulse-fast',
    motionScale: 1.25,
    particleCount: 24,
    waveStrength: 0.35,
    bloom: 0.95,
    aura: 0.9,
    uiMode: 'rich',
  },
  crown: {
    key: 'crown',
    backgroundTop: '#0A0612',
    backgroundBottom: '#120818',
    glow: '#F4EEFF',
    accent: anchorHex('crown'),
    particle: 'rgba(234,240,255,0.25)',
    control: '#D8C4FF',
    label: '#F7F2FF',
    motion: 'still',
    motionScale: 0.35,
    particleCount: 8,
    waveStrength: 0.08,
    bloom: 0.45,
    aura: 1,
    uiMode: 'minimal',
  },
  soul: {
    key: 'soul',
    backgroundTop: '#07080C',
    backgroundBottom: '#0C1018',
    glow: anchorHex('soul'),
    accent: '#FFFFFF',
    particle: 'rgba(234,240,255,0.2)',
    control: '#EAF0FF',
    label: '#F8FAFF',
    motion: 'still',
    motionScale: 0.3,
    particleCount: 6,
    waveStrength: 0.05,
    bloom: 0.4,
    aura: 1,
    uiMode: 'minimal',
  },
};

export function atmosphereForKey(key: ChakraKey): AtmospherePreset {
  return PRESETS[key];
}
