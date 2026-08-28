/**
 * Concrete PoseSource implementations.
 *
 * `SimulatedPoseSource` is a placeholder data source, not a hand detector. It
 * exists so the rest of the pipeline — normalization, alignment scoring,
 * ghost-hand overlay, coaching, hold/pause logic, error states — can be
 * built and exercised end to end today. It never reads the camera frame.
 *
 * chakraOS does not yet ship an on-device hand landmark model. Wiring one in
 * is a matter of implementing this same `PoseSource` interface against a
 * real detector (for example MediaPipe Tasks Vision's HandLandmarker running
 * through a native frame-processor plugin, or an on-device ML Kit binding)
 * and passing it to `HandTrackingEngine` instead — nothing else in
 * lib/vision or the mudra screens needs to change. See HandTrackingEngine.ts.
 */

import { HAND_LANDMARK_NAMES } from '@/lib/vision/types';
import type {
  Handedness,
  HandLandmarkName,
  Landmark,
  LandmarkSet,
  PoseSource,
  TrackingFrame,
  TrackingStatus,
} from '@/lib/vision/types';
import { normalizePose } from '@/lib/vision/PoseNormalizer';
import { buildReferenceLandmarks } from '@/lib/vision/ReferencePose';
import type { Mudra } from '@/lib/vision/MudraRegistry';
import { referencePoseFor } from '@/lib/vision/MudraRegistry';

const OPEN_HAND = buildReferenceLandmarks({
  thumb: { curl: 'relaxed', spreadDeg: 18, instruction: '' },
  index: { curl: 'extended', instruction: '' },
  middle: { curl: 'extended', instruction: '' },
  ring: { curl: 'extended', instruction: '' },
  pinky: { curl: 'extended', instruction: '' },
});

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function noiseFor(name: string, t: number, amplitude: number): number {
  const seed = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return Math.sin(t * 1.7 + seed) * amplitude;
}

export interface SimulatedPoseSourceOptions {
  /** how long the simulated hand takes to reach the reference pose, seconds */
  convergeSeconds?: number;
  hand?: Handedness;
}

/** Placeholder PoseSource — see file header. Converges toward a mudra's
 * reference pose over `convergeSeconds`, then holds there with a small
 * persistent tremor, occasionally dipping to exercise the coaching UI. */
export class SimulatedPoseSource implements PoseSource {
  private readonly hand: Handedness;
  private readonly convergeSeconds: number;
  private readonly listeners = new Set<(frame: TrackingFrame) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private forcedStatus: TrackingStatus | null = null;
  private readonly targetLandmarks: LandmarkSet;

  constructor(mudra: Mudra, opts: SimulatedPoseSourceOptions = {}) {
    this.hand = opts.hand ?? (mudra.hand === 'left' ? 'left' : 'right');
    this.convergeSeconds = opts.convergeSeconds ?? 7;
    this.targetLandmarks = referencePoseFor(mudra).landmarks;
  }

  start(): void {
    if (this.timer) return;
    this.startedAt = Date.now();
    this.timer = setInterval(() => this.tick(), 66);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  subscribe(cb: (frame: TrackingFrame) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Manual override for QA/testing the deterministic error-state UI. Pass
   * null to resume normal simulated tracking. */
  simulateStatus(status: TrackingStatus | null): void {
    this.forcedStatus = status;
  }

  private tick(): void {
    const elapsed = (Date.now() - this.startedAt) / 1000;

    if (this.forcedStatus) {
      this.emit({ status: this.forcedStatus, pose: null, timestamp: Date.now() });
      return;
    }

    // Brief, infrequent tracking blips so TRACKING LOST has something to show.
    const blipPhase = elapsed % 23;
    if (blipPhase > 22.4 && elapsed > 4) {
      this.emit({ status: 'tracking_lost', pose: null, timestamp: Date.now() });
      return;
    }

    const convergence = Math.min(1, easeOutCubic(elapsed / this.convergeSeconds));
    const tremor = 0.02 * (1 - convergence * 0.6);

    const raw = {} as Record<HandLandmarkName, Landmark>;
    for (const name of HAND_LANDMARK_NAMES) {
      const from = OPEN_HAND[name];
      const to = this.targetLandmarks[name];
      raw[name] = {
        x: lerp(from.x, to.x, convergence) + noiseFor(`${name}x`, elapsed, tremor),
        y: lerp(from.y, to.y, convergence) + noiseFor(`${name}y`, elapsed, tremor),
        z: lerp(from.z, to.z, convergence) + noiseFor(`${name}z`, elapsed, tremor * 0.5),
      };
    }

    // Simulate the hand drifting slightly in front of the camera (position,
    // scale, rotation) — this is what the normalizer is actually for.
    const driftScale = 0.17 + 0.01 * Math.sin(elapsed * 0.4);
    const driftRotation = 4 * Math.sin(elapsed * 0.25);
    const driftX = 0.5 + 0.02 * Math.sin(elapsed * 0.3);
    const driftY = 0.6 + 0.015 * Math.cos(elapsed * 0.22);
    const rad = (driftRotation * Math.PI) / 180;
    const cameraSpace = {} as Record<HandLandmarkName, Landmark>;
    for (const name of HAND_LANDMARK_NAMES) {
      const p = raw[name];
      const rx = p.x * Math.cos(rad) - p.y * Math.sin(rad);
      const ry = p.x * Math.sin(rad) + p.y * Math.cos(rad);
      cameraSpace[name] = {
        x: driftX + rx * driftScale,
        y: driftY + ry * driftScale,
        z: p.z * driftScale,
      };
    }

    const confidence = 0.82 + 0.15 * convergence;
    const pose = normalizePose(cameraSpace as LandmarkSet, this.hand, confidence);
    this.emit({ status: 'tracking', pose, timestamp: Date.now() });
  }

  private emit(frame: TrackingFrame): void {
    for (const cb of this.listeners) cb(frame);
  }
}
