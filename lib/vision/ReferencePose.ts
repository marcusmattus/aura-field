/**
 * Builds a canonical reference hand pose from a mudra's finger instructions.
 *
 * Rather than hand-authoring 21 x/y/z numbers per mudra (brittle, and hard
 * for anyone extending the registry to get right), each finger is described
 * declaratively — how curled, how splayed, what it touches — and this module
 * runs a small forward-kinematics pass to produce the landmark set. That
 * landmark set is what `MudraAlignment` compares the live camera pose
 * against, and what the ghost-hand overlay renders.
 */

import { FINGERS, FINGERTIP, HAND_LANDMARK_NAMES } from '@/lib/vision/types';
import { distance } from '@/lib/vision/HandGeometry';
import type { FingerKey, HandLandmarkName, HandPose, Landmark, LandmarkSet } from '@/lib/vision/types';
import { normalizePose } from '@/lib/vision/PoseNormalizer';

/** How curled a finger should be, expressed as a fraction for scoring but
 * authored as a named stage for readability in the registry. */
export type FingerCurlStage = 'extended' | 'relaxed' | 'curled' | 'folded';

export const CURL_STAGE_VALUE: Record<FingerCurlStage, number> = {
  extended: 0.02,
  relaxed: 0.28,
  curled: 0.62,
  folded: 0.92,
};

/** What a fingertip should be touching in the target pose, if anything. */
export interface FingerContact {
  target: FingerKey | 'palm';
  point?: 'tip' | 'pad';
}

export interface FingerInstruction {
  curl: FingerCurlStage;
  /** outward splay from neutral, degrees (0 = resting against its neighbor) */
  spreadDeg?: number;
  contact?: FingerContact;
  /** the reflective/anatomical cue shown on the learning screen */
  instruction: string;
}

export interface ReferencePoseSpec {
  landmarks: LandmarkSet;
  /** allowed deviation before a joint/contact reads as "off", 0..1 canonical units */
  tolerance: number;
}

const FINGER_BASE: Record<
  FingerKey,
  { mcp: Landmark; dirDeg: number; segLens: [number, number, number] }
> = {
  thumb: { mcp: { x: -0.55, y: -0.32, z: 0 }, dirDeg: -55, segLens: [0.32, 0.3, 0.28] },
  index: { mcp: { x: -0.32, y: -0.95, z: 0 }, dirDeg: 0, segLens: [0.38, 0.24, 0.2] },
  middle: { mcp: { x: 0, y: -1, z: 0 }, dirDeg: 0, segLens: [0.42, 0.26, 0.22] },
  ring: { mcp: { x: 0.3, y: -0.93, z: 0 }, dirDeg: 0, segLens: [0.4, 0.24, 0.2] },
  pinky: { mcp: { x: 0.55, y: -0.78, z: 0 }, dirDeg: 0, segLens: [0.32, 0.2, 0.17] },
};

/** Wrist plus the four MCP-adjacent joints stay fixed — only the chain past
 * the MCP bends with curl. thumbCmc sits between wrist and thumbMcp. */
const THUMB_CMC: Landmark = { x: -0.3, y: -0.2, z: 0 };

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

/** Builds one finger's joint chain (MCP..TIP, 3 segments) bending toward the
 * palm as curl increases from 0 (straight) to 1 (fully folded). */
function buildChain(
  base: Landmark,
  dirDeg: number,
  segLens: [number, number, number],
  curl: number,
  spreadDeg: number,
): Landmark[] {
  const maxBendPerJoint = 78; // degrees of additional bend per joint at curl=1
  const pts: Landmark[] = [base];
  let angle = dirDeg + spreadDeg;
  let cursor = base;
  for (let i = 0; i < segLens.length; i += 1) {
    // Each successive joint bends further toward the palm (angle -> +90, i.e. down/back).
    const bend = curl * maxBendPerJoint * (i + 1);
    const jointAngleDeg = angle - bend; // negative-y is "up"; subtracting rotates toward +y (palm)
    const rad = deg2rad(jointAngleDeg - 90);
    const next: Landmark = {
      x: cursor.x + Math.cos(rad) * segLens[i],
      y: cursor.y + Math.sin(rad) * segLens[i],
      z: cursor.z - curl * 0.08 * (i + 1),
    };
    pts.push(next);
    cursor = next;
  }
  return pts;
}

/** Produces the full 21-point canonical landmark set for a mudra's finger
 * instructions. Deterministic — same input always yields the same pose. */
export function buildReferenceLandmarks(
  fingers: Record<FingerKey, FingerInstruction>,
): LandmarkSet {
  const out: Partial<Record<HandLandmarkName, Landmark>> = {
    wrist: { x: 0, y: 0, z: 0 },
    thumbCmc: THUMB_CMC,
  };

  const chains: Record<FingerKey, Landmark[]> = {} as Record<FingerKey, Landmark[]>;

  for (const finger of FINGERS) {
    const instr = fingers[finger];
    const curl = CURL_STAGE_VALUE[instr.curl];
    const { mcp, dirDeg, segLens } = FINGER_BASE[finger];
    const spread = instr.spreadDeg ?? 0;
    // chain = [mcp, joint1, joint2, joint3] — the thumb only names 3 of these
    // (mcp, ip, tip) further down, so its extra joint is simply unused.
    chains[finger] = buildChain(mcp, dirDeg, segLens, curl, spread);
  }

  // Resolve fingertip contacts: snap the thumb tip onto whatever it's meant
  // to touch, which is how every one of the ten mudras in the registry is
  // actually defined traditionally (thumb as the "closing" finger).
  const thumbInstr = fingers.thumb;
  if (thumbInstr.contact && thumbInstr.contact.target !== 'palm') {
    const targetChain = chains[thumbInstr.contact.target];
    const targetTip = targetChain[targetChain.length - 1];
    const thumbChain = chains.thumb;
    thumbChain[thumbChain.length - 1] = { ...targetTip };
  } else if (thumbInstr.contact?.target === 'palm') {
    const thumbChain = chains.thumb;
    thumbChain[thumbChain.length - 1] = { x: -0.05, y: -0.35, z: -0.1 };
  }

  for (const finger of FINGERS) {
    const names =
      finger === 'thumb'
        ? (['thumbMcp', 'thumbIp', 'thumbTip'] as const)
        : finger === 'index'
          ? (['indexMcp', 'indexPip', 'indexDip', 'indexTip'] as const)
          : finger === 'middle'
            ? (['middleMcp', 'middlePip', 'middleDip', 'middleTip'] as const)
            : finger === 'ring'
              ? (['ringMcp', 'ringPip', 'ringDip', 'ringTip'] as const)
              : (['pinkyMcp', 'pinkyPip', 'pinkyDip', 'pinkyTip'] as const);
    const chain = chains[finger];
    // chain = [mcp, j1, j2, j3] for four-point fingers, [mcp, ip, tip]-shaped for thumb (3 segs -> 4 pts too)
    names.forEach((name, i) => {
      out[name] = chain[i];
    });
  }

  for (const name of HAND_LANDMARK_NAMES) {
    if (!out[name]) out[name] = { x: 0, y: 0, z: 0 };
  }
  return out as LandmarkSet;
}

/** Builds the full ReferencePoseSpec (landmarks + tolerance) for a mudra. */
export function buildReferencePose(
  fingers: Record<FingerKey, FingerInstruction>,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
): ReferencePoseSpec {
  const landmarks = buildReferenceLandmarks(fingers);
  const tolerance = difficulty === 'beginner' ? 0.22 : difficulty === 'intermediate' ? 0.16 : 0.12;
  return { landmarks, tolerance };
}

/** The reference pose as a full HandPose (curl/angles/contacts derived),
 * for the same comparison shape the live camera pose is normalized into. */
export function buildReferenceHandPose(
  fingers: Record<FingerKey, FingerInstruction>,
  hand: 'left' | 'right',
): HandPose {
  const landmarks = buildReferenceLandmarks(fingers);
  const mirrored =
    hand === 'left'
      ? (Object.fromEntries(
          HAND_LANDMARK_NAMES.map((n) => [n, { ...landmarks[n], x: -landmarks[n].x }]),
        ) as LandmarkSet)
      : landmarks;
  return normalizePose(mirrored, hand, 1);
}

/** Distance (canonical units) between two fingertips in a landmark set —
 * used both for building references and for scoring the live pose. */
export function tipDistance(landmarks: LandmarkSet, a: FingerKey, b: FingerKey): number {
  return distance(landmarks[FINGERTIP[a]], landmarks[FINGERTIP[b]]);
}
