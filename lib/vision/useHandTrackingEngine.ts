import { useEffect, useMemo, useRef, useState } from 'react';

import { HandTrackingEngine } from '@/lib/vision/HandTrackingEngine';
import type { PoseSource, TrackingFrame } from '@/lib/vision/types';

/**
 * Owns one HandTrackingEngine for the lifetime of the calling component and
 * mirrors its latest frame into React state. `active` controls whether the
 * underlying PoseSource is actually running (pause it when the camera screen
 * isn't focused, per the privacy posture in the spec — no frame processing
 * happens off-screen).
 */
export function useHandTrackingEngine(
  source: PoseSource | null,
  active: boolean,
): { frame: TrackingFrame; engine: HandTrackingEngine } {
  const engineRef = useRef<HandTrackingEngine | null>(null);
  if (!engineRef.current) engineRef.current = new HandTrackingEngine();
  const engine = engineRef.current;

  const [frame, setFrame] = useState<TrackingFrame>(engine.getLastFrame());

  useEffect(() => {
    if (!source) return undefined;
    engine.setSource(source);
    const unsubscribe = engine.subscribe(setFrame);
    if (active) engine.start();
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [source, active, engine]);

  return useMemo(() => ({ frame, engine }), [frame, engine]);
}
