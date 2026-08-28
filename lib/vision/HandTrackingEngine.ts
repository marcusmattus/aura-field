/**
 * HandTrackingEngine — the single pipeline every camera-based hand feature in
 * chakraOS runs through: Camera -> PoseSource -> Landmarks -> Normalized Pose
 * -> feature consumers (Mudra Vision today; Palm Field and future features
 * can subscribe to the same engine instead of running their own detector).
 *
 * The engine itself never talks to the camera or a model directly — it
 * orchestrates whatever PoseSource it's given (see PoseSource.ts) and adds
 * the behaviour every consumer needs on top: status debouncing so the error
 * banner doesn't flicker frame-to-frame, and a small rolling confidence
 * window so a single dropped frame doesn't read as "tracking lost".
 */

import type { PoseSource, TrackingFrame, TrackingStatus } from '@/lib/vision/types';

const DEBOUNCE_FRAMES = 3;

export type EngineListener = (frame: TrackingFrame) => void;

export class HandTrackingEngine {
  private source: PoseSource | null = null;
  private unsubscribeSource: (() => void) | null = null;
  private readonly listeners = new Set<EngineListener>();
  private lastFrame: TrackingFrame = { status: 'idle', pose: null, timestamp: Date.now() };
  private pendingStatus: TrackingStatus | null = null;
  private pendingCount = 0;

  /** Swap in a different PoseSource (e.g. a real on-device detector) without
   * any consumer needing to know — this is the seam described in the file
   * header and in PoseSource.ts. */
  setSource(source: PoseSource): void {
    this.stop();
    this.source = source;
  }

  start(): void {
    if (!this.source) return;
    this.unsubscribeSource?.();
    this.unsubscribeSource = this.source.subscribe((frame) => this.onFrame(frame));
    void this.source.start();
  }

  stop(): void {
    this.unsubscribeSource?.();
    this.unsubscribeSource = null;
    this.source?.stop();
    this.pendingStatus = null;
    this.pendingCount = 0;
  }

  subscribe(cb: EngineListener): () => void {
    this.listeners.add(cb);
    cb(this.lastFrame);
    return () => this.listeners.delete(cb);
  }

  getLastFrame(): TrackingFrame {
    return this.lastFrame;
  }

  private onFrame(frame: TrackingFrame): void {
    // Debounce status transitions: require a few consecutive frames of a new
    // status before switching, so error banners don't strobe on transient
    // single-frame drops. 'tracking' with a pose is always applied immediately.
    if (frame.status === 'tracking' || frame.status === this.lastFrame.status) {
      this.pendingStatus = null;
      this.pendingCount = 0;
      this.lastFrame = frame;
    } else if (frame.status === this.pendingStatus) {
      this.pendingCount += 1;
      if (this.pendingCount >= DEBOUNCE_FRAMES) {
        this.lastFrame = frame;
        this.pendingStatus = null;
        this.pendingCount = 0;
      }
    } else {
      this.pendingStatus = frame.status;
      this.pendingCount = 1;
    }

    for (const cb of this.listeners) cb(this.lastFrame);
  }
}
