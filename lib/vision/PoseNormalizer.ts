/**
 * Normalizes a raw, camera-space hand pose into a canonical, hand-relative
 * frame: wrist at the origin, wrist->middle-MCP as one unit of length,
 * rotated so that segment points straight "up". This is what makes the
 * alignment engine work for any hand size or camera distance — a small hand
 * close to the lens and a large hand far from it normalize to the same
 * pose if the finger shapes match.
 *
 * It also does the inverse: given a user's raw pose, place the *reference*
 * hand at the same scale/rotation/position so the ghost-hand overlay always
 * sits on top of the user's real hand (Section 5 of the spec).
 */

import { FINGERS, FINGERTIP, FINGER_MCP } from '@/lib/vision/types';
import { handScale, fingerCurl, fingerJointAngle, palmRotation, detectContactPoints } from '@/lib/vision/HandGeometry';
import type { HandLandmarkName, HandPose, Handedness, Landmark, LandmarkSet } from '@/lib/vision/types';
import { HAND_LANDMARK_NAMES } from '@/lib/vision/types';

export interface FrameTransform {
  scale: number;
  rotationDeg: number;
  originX: number;
  originY: number;
}

function rotate(p: { x: number; y: number }, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Raw landmarks (camera-space, keyed by joint name) -> the transform that
 * maps the canonical frame onto this hand's position/scale/rotation. */
export function computeFrameTransform(raw: LandmarkSet): FrameTransform {
  const scale = handScale(raw);
  const rotationDeg = palmRotation(raw);
  return { scale, rotationDeg, originX: raw.wrist.x, originY: raw.wrist.y };
}

/** Canonical-frame landmarks -> raw camera-space, using a given transform.
 * This is how the reference/ghost hand is projected onto the live camera
 * feed at the user's actual scale, rotation and position. */
export function applyFrameTransform(canonical: LandmarkSet, t: FrameTransform): LandmarkSet {
  const out = {} as LandmarkSet;
  for (const name of HAND_LANDMARK_NAMES) {
    const p = canonical[name];
    const rotated = rotate({ x: p.x, y: p.y }, t.rotationDeg);
    out[name] = {
      x: t.originX + rotated.x * t.scale,
      y: t.originY + rotated.y * t.scale,
      z: p.z * t.scale,
    };
  }
  return out;
}

/** Raw camera-space landmarks -> canonical hand-relative frame (inverse of
 * applyFrameTransform), the space every alignment computation runs in. */
export function toCanonicalFrame(raw: LandmarkSet): LandmarkSet {
  const t = computeFrameTransform(raw);
  const out = {} as LandmarkSet;
  for (const name of HAND_LANDMARK_NAMES) {
    const p = raw[name];
    const translated = { x: (p.x - t.originX) / t.scale, y: (p.y - t.originY) / t.scale };
    const derotated = rotate(translated, -t.rotationDeg);
    out[name] = { x: derotated.x, y: derotated.y, z: p.z / t.scale };
  }
  return out;
}

/** Builds a fully-derived HandPose (curl, angles, contacts, rotation) from a
 * raw landmark set straight off the detector, in canonical (hand-relative)
 * space so it can be compared directly against a reference pose. */
export function normalizePose(
  raw: LandmarkSet,
  handedness: Handedness,
  confidence: number,
): HandPose {
  const canonical = toCanonicalFrame(raw);
  const fingerCurlMap = Object.fromEntries(
    FINGERS.map((f) => [f, fingerCurl(canonical, f)]),
  ) as HandPose['fingerCurl'];
  const fingerAngleMap = Object.fromEntries(
    FINGERS.map((f) => [f, fingerJointAngle(canonical, f)]),
  ) as HandPose['fingerAngles'];

  return {
    landmarks: canonical,
    rawLandmarks: raw,
    handedness,
    palmRotation: palmRotation(raw),
    fingerCurl: fingerCurlMap,
    fingerAngles: fingerAngleMap,
    contactPoints: detectContactPoints(canonical),
    confidence,
  };
}

/** Placeholder identity landmark for a joint that hasn't been positioned yet. */
export function zeroLandmark(): Landmark {
  return { x: 0, y: 0, z: 0 };
}

export function emptyLandmarkSet(): LandmarkSet {
  const out = {} as Record<HandLandmarkName, Landmark>;
  for (const name of HAND_LANDMARK_NAMES) out[name] = zeroLandmark();
  return out as LandmarkSet;
}

export { FINGERTIP, FINGER_MCP };
