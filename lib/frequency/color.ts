/**
 * Frequency → color / visual derivation.
 * Colours still derive from carrier Hz (no hardcoded session palettes),
 * but hue anchors follow traditional chakra associations so the sound
 * library is red → orange → gold → green → blue → indigo → violet —
 * not a purple wash.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface DerivedPalette {
  /** Primary hex derived from carrier frequency */
  color: string;
  /** Soft background tint */
  soft: string;
  /** Glow / aura hex */
  glow: string;
  /** CSS-ready linear gradient stops */
  gradient: [string, string, string];
  /** Visualizer pulse rate (Hz-ish, scaled for animation) */
  pulseHz: number;
  /** Glow intensity 0–1 from beat energy */
  glowIntensity: number;
  /** Brainwave-ish motion scale */
  motionScale: number;
  rgb: Rgb;
  /** Resolved hue degrees 0–360 */
  hue: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hue < 60) {
    rp = c;
    gp = x;
  } else if (hue < 120) {
    rp = x;
    gp = c;
  } else if (hue < 180) {
    gp = c;
    bp = x;
  } else if (hue < 240) {
    gp = x;
    bp = c;
  } else if (hue < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function withAlpha(hex: string, alpha: number): string {
  const a = clamp(Math.round(alpha * 255), 0, 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * Solfeggio / field carrier Hz → traditional chakra hue (°).
 * Anchors are the nine registry frequencies; unknown Hz interpolate
 * between the nearest two body-spectrum anchors (soul handled as its own node).
 */
const HUE_ANCHORS: ReadonlyArray<{ hz: number; hue: number }> = [
  { hz: 174, hue: 8 }, // Earth — deep crimson / brown-red
  { hz: 285, hue: 300 }, // Soul — soft magenta-lavender (source, not body rainbow)
  { hz: 396, hue: 2 }, // Root — true red
  { hz: 417, hue: 28 }, // Sacral — orange
  { hz: 528, hue: 48 }, // Solar — gold / yellow
  { hz: 639, hue: 142 }, // Heart — green
  { hz: 741, hue: 208 }, // Throat — clear blue
  { hz: 852, hue: 252 }, // Third Eye — indigo
  { hz: 963, hue: 278 }, // Crown — violet (not neon purple)
];

function lerpHue(a: number, b: number, t: number): number {
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return ((a + delta * t) % 360 + 360) % 360;
}

/**
 * Map carrier Hz to a hue that matches chakra colour tradition.
 * Exact registry frequencies hit anchors; other Hz blend between neighbours.
 */
export function hueFromFrequency(hz: number): number {
  const f = clamp(hz, 100, 1200);
  const sorted = HUE_ANCHORS;

  // Exact / near-exact hit (solfeggio rounding)
  for (const anchor of sorted) {
    if (Math.abs(anchor.hz - f) < 1.5) return anchor.hue;
  }

  if (f <= sorted[0].hz) return sorted[0].hue;
  if (f >= sorted[sorted.length - 1].hz) return sorted[sorted.length - 1].hue;

  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (f >= lo.hz && f <= hi.hz) {
      const t = (f - lo.hz) / (hi.hz - lo.hz);
      return lerpHue(lo.hue, hi.hue, t);
    }
  }

  return sorted[sorted.length - 1].hue;
}

/** Lightness tuned so yellows stay readable and reds stay deep, without a purple cast. */
function lightnessForHue(hue: number, hz: number): number {
  const h = ((hue % 360) + 360) % 360;
  // Yellows need higher L; reds/indigos sit lower
  let base = 48;
  if (h >= 35 && h <= 65) base = 52; // gold
  if (h >= 130 && h <= 160) base = 46; // green
  if (h >= 200 && h <= 230) base = 50; // blue
  if (h >= 245 && h <= 290) base = 52; // indigo / violet — keep luminous, not muddy purple
  if (h >= 290 || h < 20) base = 46; // magenta / red
  return clamp(base + (hz / 4000) * 10, 40, 60);
}

export function colorFromFrequency(hz: number, beatHz = 8): DerivedPalette {
  const hue = hueFromFrequency(hz);
  // Cap saturation so crown/soul stay violet-lavender, not electric purple
  const sat = clamp(58 + Math.min(beatHz, 12) * 0.4, 52, 78);
  const light = lightnessForHue(hue, hz);
  const rgb = hslToRgb(hue, sat, light);
  const color = rgbToHex(rgb);
  const softRgb = hslToRgb(hue, sat * 0.5, clamp(light + 16, 42, 78));
  const soft = rgbToHex(softRgb);
  const glowRgb = hslToRgb(hue, clamp(sat + 4, 0, 82), clamp(light + 8, 42, 70));
  const glow = rgbToHex(glowRgb);
  const deep = rgbToHex(hslToRgb(hue, sat, clamp(light - 20, 14, 38)));
  const mid = rgbToHex(hslToRgb(hue, sat * 0.92, light));
  const bright = rgbToHex(hslToRgb(hue, sat * 0.65, clamp(light + 18, 52, 82)));

  return {
    color,
    soft,
    glow,
    gradient: [deep, mid, bright],
    pulseHz: clamp(beatHz / 4, 0.4, 12),
    glowIntensity: clamp(0.35 + beatHz / 80, 0.3, 0.95),
    motionScale: clamp(0.5 + beatHz / 40, 0.4, 1.6),
    rgb,
    hue,
  };
}

/** Convenience: hex only. */
export function hexFromFrequency(hz: number, beatHz = 8): string {
  return colorFromFrequency(hz, beatHz).color;
}

/** Soft translucent fill for Skia / overlays. */
export function glowFromFrequency(hz: number, beatHz = 8, alpha = 0.45): string {
  return withAlpha(colorFromFrequency(hz, beatHz).glow, alpha);
}

/** Exported for tests — expected hue bands per known carrier. */
export const HUE_BANDS = {
  earth: [0, 25],
  root: [0, 18],
  sacral: [18, 45],
  solar: [40, 65],
  heart: [110, 160],
  throat: [190, 230],
  third: [240, 270],
  crown: [265, 295],
  soul: [285, 320],
} as const;
