/**
 * Frequency → color derivation.
 * Exact hex anchors (authority) at each carrier Hz; unknown Hz interpolate in RGB.
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
  /** Resolved hue degrees 0–360 (from derived RGB) */
  hue: number;
}

/** Exact carrier → colour table (product authority). */
export const FREQUENCY_COLOR_ANCHORS: ReadonlyArray<{ hz: number; hex: string; key: string }> = [
  { hz: 174, hex: '#C0433A', key: 'earth' },
  { hz: 396, hex: '#FF4D5E', key: 'root' },
  { hz: 417, hex: '#FF8A3D', key: 'sacral' },
  { hz: 528, hex: '#FFD23D', key: 'solar' },
  { hz: 639, hex: '#36F5A6', key: 'heart' },
  { hz: 741, hex: '#3DB6FF', key: 'throat' },
  { hz: 852, hex: '#6B6BFF', key: 'third' },
  { hz: 963, hex: '#B14DFF', key: 'crown' },
  { hz: 1074, hex: '#EAF0FF', key: 'soul' },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

function withAlpha(hex: string, alpha: number): string {
  const a = clamp(Math.round(alpha * 255), 0, 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

function mixToward(rgb: Rgb, target: Rgb, t: number): Rgb {
  return lerpRgb(rgb, target, t);
}

function rgbToHue({ r, g, b }: Rgb): number {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return h;
}

function lighten(rgb: Rgb, amount: number): Rgb {
  return mixToward(rgb, { r: 255, g: 255, b: 255 }, amount);
}

function darken(rgb: Rgb, amount: number): Rgb {
  return mixToward(rgb, { r: 0, g: 0, b: 0 }, amount);
}

/** Resolve primary RGB for a carrier frequency from the authority table. */
export function rgbFromFrequency(hz: number): Rgb {
  const f = clamp(hz, 100, 2000);
  const anchors = FREQUENCY_COLOR_ANCHORS;

  for (const anchor of anchors) {
    if (Math.abs(anchor.hz - f) < 1.5) return hexToRgb(anchor.hex);
  }

  // Soul band: anything at/above 1074 Hz
  if (f >= 1074) return hexToRgb('#EAF0FF');

  if (f <= anchors[0].hz) return hexToRgb(anchors[0].hex);
  if (f >= anchors[anchors.length - 1].hz) return hexToRgb(anchors[anchors.length - 1].hex);

  for (let i = 0; i < anchors.length - 1; i++) {
    const lo = anchors[i];
    const hi = anchors[i + 1];
    if (f >= lo.hz && f <= hi.hz) {
      const t = (f - lo.hz) / (hi.hz - lo.hz);
      return lerpRgb(hexToRgb(lo.hex), hexToRgb(hi.hex), t);
    }
  }

  return hexToRgb(anchors[anchors.length - 1].hex);
}

export function hueFromFrequency(hz: number): number {
  return rgbToHue(rgbFromFrequency(hz));
}

export function colorFromFrequency(hz: number, beatHz = 8): DerivedPalette {
  const rgb = rgbFromFrequency(hz);
  const color = rgbToHex(rgb);
  const soft = rgbToHex(lighten(rgb, 0.35));
  const glow = rgbToHex(lighten(rgb, 0.15));
  const deep = rgbToHex(darken(rgb, 0.45));
  const mid = color;
  const bright = rgbToHex(lighten(rgb, 0.28));

  return {
    color,
    soft,
    glow,
    gradient: [deep, mid, bright],
    pulseHz: clamp(beatHz / 4, 0.4, 12),
    glowIntensity: clamp(0.35 + beatHz / 80, 0.3, 0.95),
    motionScale: clamp(0.5 + beatHz / 40, 0.4, 1.6),
    rgb,
    hue: rgbToHue(rgb),
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
