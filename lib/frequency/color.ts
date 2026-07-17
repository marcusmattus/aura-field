/**
 * Frequency → color / visual derivation.
 * No hardcoded session colours: everything derives from carrier + beat Hz.
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
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) {
    rp = c;
    gp = x;
  } else if (h < 120) {
    rp = x;
    gp = c;
  } else if (h < 180) {
    gp = c;
    bp = x;
  } else if (h < 240) {
    gp = x;
    bp = c;
  } else if (h < 300) {
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
 * Map audible / solfeggio carrier Hz to a hue on a warm→cool continuum.
 * ~170 Hz → deep red/brown, ~400 → red-orange, ~528 → gold-green,
 * ~640 → green, ~740 → blue, ~850 → indigo, ~960 → violet.
 */
export function hueFromFrequency(hz: number): number {
  const f = clamp(hz, 100, 1200);
  // log-ish spread across the solfeggio range
  const t = Math.log(f / 100) / Math.log(1200 / 100);
  return clamp(t * 300, 0, 300); // 0° red → ~300° magenta/violet
}

export function colorFromFrequency(hz: number, beatHz = 8): DerivedPalette {
  const hue = hueFromFrequency(hz);
  const sat = clamp(62 + beatHz * 0.35, 55, 85);
  const light = clamp(48 + (hz / 2000) * 20, 38, 68);
  const rgb = hslToRgb(hue, sat, light);
  const color = rgbToHex(rgb);
  const softRgb = hslToRgb(hue, sat * 0.55, clamp(light + 18, 40, 82));
  const soft = rgbToHex(softRgb);
  const glowRgb = hslToRgb(hue, clamp(sat + 8, 0, 95), clamp(light + 10, 40, 75));
  const glow = rgbToHex(glowRgb);
  const deep = rgbToHex(hslToRgb(hue, sat, clamp(light - 22, 12, 40)));
  const mid = rgbToHex(hslToRgb(hue, sat * 0.9, light));
  const bright = rgbToHex(hslToRgb(hue, sat * 0.7, clamp(light + 22, 50, 88)));

  return {
    color,
    soft,
    glow,
    gradient: [deep, mid, bright],
    pulseHz: clamp(beatHz / 4, 0.4, 12),
    glowIntensity: clamp(0.35 + beatHz / 80, 0.3, 0.95),
    motionScale: clamp(0.5 + beatHz / 40, 0.4, 1.6),
    rgb,
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
