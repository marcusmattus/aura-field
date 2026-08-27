/**
 * The alignment engine. Deterministic, local, pure math — no LLM is ever
 * involved in scoring a physical hand pose. It answers exactly one question:
 * how closely does the detected hand match the selected reference pose.
 *
 * Nothing here is a measure of health, consciousness or spiritual ability —
 * it is camera-estimated geometric similarity, full stop.
 */

import { FINGERS, FINGERTIP } from '@/lib/vision/types';
import { distance } from '@/lib/vision/HandGeometry';
import type { FingerKey, HandPose } from '@/lib/vision/types';

export interface FingerScore {
  finger: FingerKey;
  score: number; // 0-100
  curlDiff: number; // degrees
}

export interface ContactScore {
  label: string;
  a: FingerKey;
  b: FingerKey | 'palm';
  score: number; // 0-100
  distance: number;
}

export interface Correction {
  code: string;
  severity: 'good' | 'adjust' | 'reset';
  message: string;
  /** 0-100, how much this is dragging the overall score down — used to rank corrections */
  weight: number;
}

export interface FormMatchResult {
  overall: number; // 0-100
  fingerScores: FingerScore[];
  contactScores: ContactScore[];
  palmRotationScore: number;
  palmRotationDiffDeg: number;
  spacingScore: number;
  corrections: Correction[];
  /** the two highest-priority corrections, for the always-on coaching HUD */
  topCorrections: Correction[];
}

const WEIGHTS = {
  fingers: 0.4,
  contacts: 0.25,
  angular: 0.2,
  spatial: 0.15,
};

function clampScore(diff: number, tolerance: number): number {
  const ratio = diff / Math.max(tolerance, 1e-6);
  return Math.max(0, Math.round(100 * Math.exp(-1.35 * ratio * ratio)));
}

function fingerLabel(f: FingerKey): string {
  return f.toUpperCase();
}

/** Per-finger curl/shape alignment: how close each finger's bend is to the reference. */
export function scoreFingers(user: HandPose, ref: HandPose, tolerance: number): FingerScore[] {
  return FINGERS.map((finger) => {
    const userCurl = user.fingerCurl[finger];
    const refCurl = ref.fingerCurl[finger];
    const curlDiffFraction = Math.abs(userCurl - refCurl);
    const curlDiffDeg = curlDiffFraction * 130; // inverse of fingerCurl's 130deg range
    const tipDiff = distance(user.landmarks[FINGERTIP[finger]], ref.landmarks[FINGERTIP[finger]]);
    const shapeScore = clampScore(curlDiffFraction, tolerance);
    const tipScore = clampScore(tipDiff, tolerance * 1.6);
    return {
      finger,
      score: Math.round(shapeScore * 0.65 + tipScore * 0.35),
      curlDiff: Math.round(curlDiffDeg),
    };
  });
}

/** Detects whether the reference pose specifies any fingertip contacts, then
 * scores how well the live pose reproduces each one. */
export function scoreContacts(
  user: HandPose,
  ref: HandPose,
  tolerance: number,
): ContactScore[] {
  return ref.contactPoints.map((refContact) => {
    const a = user.landmarks[FINGERTIP[refContact.a]];
    const b =
      refContact.b === 'palm'
        ? ref.landmarks.wrist // palm-proximity reference approximated at wrist for scoring
        : user.landmarks[FINGERTIP[refContact.b]];
    const liveDistance =
      refContact.b === 'palm'
        ? distance(user.landmarks[FINGERTIP[refContact.a]], user.landmarks.wrist)
        : distance(a, b);
    const target = refContact.distance;
    const diff = Math.abs(liveDistance - target);
    return {
      label:
        refContact.b === 'palm'
          ? `${fingerLabel(refContact.a)} / PALM`
          : `${fingerLabel(refContact.a)} / ${fingerLabel(refContact.b)}`,
      a: refContact.a,
      b: refContact.b,
      score: clampScore(diff, tolerance),
      distance: liveDistance,
    };
  });
}

/** Palm rotation + relative finger-angle alignment. */
export function scoreAngular(
  user: HandPose,
  ref: HandPose,
  tolerance: number,
): { score: number; diffDeg: number } {
  let diffDeg = Math.abs(user.palmRotation - ref.palmRotation);
  if (diffDeg > 180) diffDeg = 360 - diffDeg;
  const score = clampScore(diffDeg / 90, tolerance);
  return { score, diffDeg: Math.round(diffDeg) };
}

/** Fingertip spacing / relative landmark spatial alignment. */
export function scoreSpatial(user: HandPose, ref: HandPose, tolerance: number): number {
  const pairs: [FingerKey, FingerKey][] = [
    ['thumb', 'index'],
    ['index', 'middle'],
    ['middle', 'ring'],
    ['ring', 'pinky'],
  ];
  const diffs = pairs.map(([a, b]) => {
    const userSpacing = distance(user.landmarks[FINGERTIP[a]], user.landmarks[FINGERTIP[b]]);
    const refSpacing = distance(ref.landmarks[FINGERTIP[a]], ref.landmarks[FINGERTIP[b]]);
    return Math.abs(userSpacing - refSpacing);
  });
  const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
  return clampScore(mean, tolerance);
}

function buildCorrections(
  fingerScores: FingerScore[],
  contactScores: ContactScore[],
  angular: { score: number; diffDeg: number },
  spacingScore: number,
): Correction[] {
  const corrections: Correction[] = [];

  for (const fs of fingerScores) {
    if (fs.score >= 85) {
      corrections.push({
        code: `finger:${fs.finger}`,
        severity: 'good',
        message: `${fingerLabel(fs.finger)} POSITION`,
        weight: 0,
      });
    } else {
      corrections.push({
        code: `finger:${fs.finger}`,
        severity: fs.score >= 55 ? 'adjust' : 'reset',
        message: `${fingerLabel(fs.finger)} ${fs.curlDiff > 0 ? 'TOO EXTENDED' : 'TOO CURLED'}`,
        weight: 100 - fs.score,
      });
    }
  }

  for (const cs of contactScores) {
    if (cs.score >= 85) {
      corrections.push({
        code: `contact:${cs.a}-${cs.b}`,
        severity: 'good',
        message: `${cs.label} CONTACT`,
        weight: 0,
      });
    } else {
      corrections.push({
        code: `contact:${cs.a}-${cs.b}`,
        severity: cs.score >= 55 ? 'adjust' : 'reset',
        message: `BRING ${cs.label} TOGETHER`,
        weight: (100 - cs.score) * 1.1,
      });
    }
  }

  if (angular.score >= 85) {
    corrections.push({ code: 'palm', severity: 'good', message: 'PALM ORIENTATION', weight: 0 });
  } else {
    corrections.push({
      code: 'palm',
      severity: angular.score >= 55 ? 'adjust' : 'reset',
      message: `ROTATE PALM ${angular.diffDeg}°`,
      weight: 100 - angular.score,
    });
  }

  if (spacingScore < 85) {
    corrections.push({
      code: 'spacing',
      severity: spacingScore >= 55 ? 'adjust' : 'reset',
      message: 'ADJUST FINGER SPACING',
      weight: 100 - spacingScore,
    });
  }

  return corrections;
}

/**
 * Compares a live (already-normalized) hand pose against a mudra's reference
 * pose and produces a full FORM MATCH breakdown, 0-100, plus prioritized
 * corrections for the real-time coaching HUD (top two only — see spec §8).
 */
export function computeFormMatch(user: HandPose, ref: HandPose, tolerance: number): FormMatchResult {
  const fingerScores = scoreFingers(user, ref, tolerance);
  const contactScores = scoreContacts(user, ref, tolerance);
  const angular = scoreAngular(user, ref, tolerance);
  const spacingScore = scoreSpatial(user, ref, tolerance);

  const fingerAvg = fingerScores.reduce((s, f) => s + f.score, 0) / fingerScores.length;
  const contactAvg = contactScores.length
    ? contactScores.reduce((s, c) => s + c.score, 0) / contactScores.length
    : 100;

  const overall = Math.round(
    fingerAvg * WEIGHTS.fingers +
      contactAvg * WEIGHTS.contacts +
      angular.score * WEIGHTS.angular +
      spacingScore * WEIGHTS.spatial,
  );

  const corrections = buildCorrections(fingerScores, contactScores, angular, spacingScore);
  const topCorrections = corrections
    .filter((c) => c.severity !== 'good')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    fingerScores,
    contactScores,
    palmRotationScore: angular.score,
    palmRotationDiffDeg: angular.diffDeg,
    spacingScore,
    corrections,
    topCorrections,
  };
}
