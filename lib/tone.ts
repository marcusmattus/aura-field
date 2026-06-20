/**
 * On-device tone synthesis. Generates a short, seamlessly-looping stereo WAV
 * (PCM 16-bit) as a base64 data URI — no asset files, fully offline.
 *
 * Left channel  = solfeggio carrier (e.g. 852 Hz)
 * Right channel = carrier + binaural beat (e.g. 852 + 8 Hz)
 * The difference is perceived as a slow binaural beat in the chosen brainwave
 * band. A soft sub-drone and gentle amplitude breathing keep it from feeling
 * sterile. Framed as ritual/ambience, not a clinical claim.
 */

const SAMPLE_RATE = 44_100;

/** Parse "binaural beat 8 Hz · alpha" -> 8. Falls back to 8 Hz (alpha). */
export function beatHzFromBand(band: string): number {
  const m = band.match(/(\d+(?:\.\d+)?)\s*hz/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 && n < 40 ? n : 8;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function bytesToBase64(bytes: Uint8Array): string {
  // btoa exists on web + Hermes; chunk to avoid call-stack limits.
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

interface ToneOptions {
  /** carrier frequency in Hz (the solfeggio tone) */
  carrierHz: number;
  /** binaural beat frequency in Hz (difference between ears) */
  beatHz: number;
  /** loop length in seconds — chosen so the beat completes whole cycles */
  seconds?: number;
}

/**
 * Build a seamlessly-looping stereo WAV data URI for the given tone.
 * The loop length is snapped to a whole number of beat cycles so playback
 * loops without a click.
 */
export function buildToneUri({ carrierHz, beatHz, seconds = 6 }: ToneOptions): string {
  // snap duration to whole beat cycles for a seamless loop
  const cycles = Math.max(1, Math.round(seconds * beatHz));
  const duration = cycles / beatHz;
  const frames = Math.floor(duration * SAMPLE_RATE);

  const subHz = carrierHz / 2; // soft sub-octave drone for body
  const twoPi = Math.PI * 2;

  const dataBytes = frames * 2 * 2; // stereo, 16-bit
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 2, true); // stereo
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2 * 2, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  const leftHz = carrierHz;
  const rightHz = carrierHz + beatHz;
  const fadeFrames = Math.floor(SAMPLE_RATE * 0.02); // 20ms edge fade (loop safety)

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    const t = i / SAMPLE_RATE;
    // slow amplitude breathing over the whole loop (one full breath per loop)
    const breath = 0.82 + 0.18 * Math.sin((twoPi * i) / frames);
    const sub = Math.sin(twoPi * subHz * t) * 0.18;

    let edge = 1;
    if (i < fadeFrames) edge = i / fadeFrames;
    else if (i > frames - fadeFrames) edge = (frames - i) / fadeFrames;

    const gain = 0.5 * breath * edge;
    const l = (Math.sin(twoPi * leftHz * t) * 0.62 + sub) * gain;
    const r = (Math.sin(twoPi * rightHz * t) * 0.62 + sub) * gain;

    view.setInt16(offset, Math.max(-1, Math.min(1, l)) * 32767, true);
    offset += 2;
    view.setInt16(offset, Math.max(-1, Math.min(1, r)) * 32767, true);
    offset += 2;
  }

  const base64 = bytesToBase64(new Uint8Array(buffer));
  return `data:audio/wav;base64,${base64}`;
}
