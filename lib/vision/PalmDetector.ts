/**
 * Palm Field's integration point into the shared vision engine (spec §16-17:
 * "Do not build two independent hand tracking systems"). Palm Field's own
 * rig (components/palm/PalmRig.tsx) is a manual align/scan/lock interaction
 * that never reads the camera image today, so there is nothing to migrate
 * onto a detector yet — but if/when Palm Field wants real hand-following
 * (auto-locking the rig to the user's actual hand instead of a manual
 * pinch/drag), it drives from the same HandTrackingEngine + PoseSource pair
 * Mudra Vision uses, via this hook, rather than a second pipeline.
 */

import { useHandTrackingEngine } from '@/lib/vision/useHandTrackingEngine';
import type { PoseSource, TrackingFrame } from '@/lib/vision/types';
import type { HandTrackingEngine } from '@/lib/vision/HandTrackingEngine';

export function usePalmDetector(
  source: PoseSource | null,
  active: boolean,
): { frame: TrackingFrame; engine: HandTrackingEngine } {
  return useHandTrackingEngine(source, active);
}
