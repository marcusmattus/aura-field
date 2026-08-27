/**
 * Deterministic hand geometry math. Pure functions only — every number here
 * is computed from landmark positions, never inferred, guessed, or produced
 * by a model. This is the layer the product principle in the spec calls
 * "how closely does my hand match the reference position" and nothing else.
 */

import {
  FINGER_JOINTS,
  FINGER_MCP,
  FINGERS,
  FINGERTIP,
  type ContactPoint,
  type FingerKey,
  type Landmark,
  type LandmarkSet,
} from '@/lib/vision/types';

export function distance(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Angle (degrees) at vertex `b` formed by rays b->a and b->c. */
export function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);
  if (mag1 === 0 || mag2 === 0) return 180;
  const cos = Math.min(1, Math.max(-1, dot / (mag1 * mag2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Average joint angle (degrees) along a finger's chain (MCP + PIP), the
 * standard proxy for "how bent is this finger". 180deg = fully straight.
 */
export function fingerJointAngle(landmarks: LandmarkSet, finger: FingerKey): number {
  const joints = FINGER_JOINTS[finger];
  const pts = joints.map((j) => landmarks[j]);
  const angles: number[] = [];
  for (let i = 0; i < pts.length - 2; i += 1) {
    angles.push(angleAt(pts[i], pts[i + 1], pts[i + 2]));
  }
  return angles.reduce((a, b) => a + b, 0) / angles.length;
}

/** 0 (straight) .. 1 (fully curled) derived from the joint angle. */
export function fingerCurl(landmarks: LandmarkSet, finger: FingerKey): number {
  const angle = fingerJointAngle(landmarks, finger);
  const curled = Math.min(1, Math.max(0, (180 - angle) / 130));
  return curled;
}

/** Palm rotation in degrees about the camera axis. 0 = index-to-pinky line
 * runs level and the middle finger points straight up from the wrist. */
export function palmRotation(landmarks: LandmarkSet): number {
  const wrist = landmarks.wrist;
  const middleMcp = landmarks.middleMcp;
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const angleFromUp = (Math.atan2(dx, -dy) * 180) / Math.PI;
  return angleFromUp;
}

/** Tip-to-tip (or tip-to-palm-center) distance between two fingers. */
export function fingerSpacing(landmarks: LandmarkSet, a: FingerKey, b: FingerKey): number {
  return distance(landmarks[FINGERTIP[a]], landmarks[FINGERTIP[b]]);
}

/** Approximate palm center: mean of the four MCP joints and the wrist. */
export function palmCenter(landmarks: LandmarkSet): Landmark {
  const pts = [
    landmarks.wrist,
    landmarks.indexMcp,
    landmarks.middleMcp,
    landmarks.ringMcp,
    landmarks.pinkyMcp,
  ];
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

/** Unit length used to normalize a hand: wrist -> middle-MCP distance. */
export function handScale(landmarks: LandmarkSet): number {
  return Math.max(1e-6, distance(landmarks.wrist, landmarks.middleMcp));
}

/** All fingertip/fingertip and fingertip/palm distances worth reporting as
 * contact points, in hand-relative units (call on a normalized pose). */
export function detectContactPoints(landmarks: LandmarkSet, thresholdNorm = 0.35): ContactPoint[] {
  const out: ContactPoint[] = [];
  const center = palmCenter(landmarks);
  for (let i = 0; i < FINGERS.length; i += 1) {
    for (let j = i + 1; j < FINGERS.length; j += 1) {
      const a = FINGERS[i];
      const b = FINGERS[j];
      const d = fingerSpacing(landmarks, a, b);
      if (d <= thresholdNorm) out.push({ a, b, distance: d });
    }
    const tipToPalm = distance(landmarks[FINGERTIP[FINGERS[i]]], center);
    if (tipToPalm <= thresholdNorm) out.push({ a: FINGERS[i], b: 'palm', distance: tipToPalm });
  }
  return out;
}

/** Fingertip position relative to its own MCP, useful for spatial diffing. */
export function fingertipOffset(landmarks: LandmarkSet, finger: FingerKey): Landmark {
  const tip = landmarks[FINGERTIP[finger]];
  const mcp = landmarks[FINGER_MCP[finger]];
  return { x: tip.x - mcp.x, y: tip.y - mcp.y, z: tip.z - mcp.z };
}
