import { describe, expect, it } from 'vitest';

import { angleAt, distance, fingerCurl } from '../lib/vision/HandGeometry';
import { computeFormMatch } from '../lib/vision/MudraAlignment';
import { MUDRAS, referenceHandPoseFor, referencePoseFor } from '../lib/vision/MudraRegistry';
import { applyFrameTransform, computeFrameTransform, toCanonicalFrame } from '../lib/vision/PoseNormalizer';
import { buildReferenceHandPose, buildReferenceLandmarks } from '../lib/vision/ReferencePose';
import { HAND_LANDMARK_NAMES } from '../lib/vision/types';

describe('HandGeometry primitives', () => {
  it('distance is zero for identical points and symmetric', () => {
    const a = { x: 0.1, y: 0.2, z: 0 };
    const b = { x: 0.4, y: -0.1, z: 0.05 };
    expect(distance(a, a)).toBe(0);
    expect(distance(a, b)).toBeCloseTo(distance(b, a), 10);
  });

  it('angleAt reads 180deg for a straight line and ~90deg for a right angle', () => {
    const straight = angleAt({ x: -1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    expect(straight).toBeCloseTo(180, 0);
    const right = angleAt({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(right).toBeCloseTo(90, 0);
  });

  it('fingerCurl increases monotonically as a finger bends more', () => {
    const straightHand = buildReferenceLandmarks({
      thumb: { curl: 'extended', instruction: '' },
      index: { curl: 'extended', instruction: '' },
      middle: { curl: 'extended', instruction: '' },
      ring: { curl: 'extended', instruction: '' },
      pinky: { curl: 'extended', instruction: '' },
    });
    const curledHand = buildReferenceLandmarks({
      thumb: { curl: 'extended', instruction: '' },
      index: { curl: 'folded', instruction: '' },
      middle: { curl: 'extended', instruction: '' },
      ring: { curl: 'extended', instruction: '' },
      pinky: { curl: 'extended', instruction: '' },
    });
    expect(fingerCurl(curledHand, 'index')).toBeGreaterThan(fingerCurl(straightHand, 'index'));
  });
});

describe('PoseNormalizer', () => {
  it('applyFrameTransform then toCanonicalFrame round-trips a canonical pose', () => {
    const canonical = buildReferenceLandmarks({
      thumb: { curl: 'curled', contact: { target: 'index' }, instruction: '' },
      index: { curl: 'curled', contact: { target: 'thumb' }, instruction: '' },
      middle: { curl: 'extended', instruction: '' },
      ring: { curl: 'extended', instruction: '' },
      pinky: { curl: 'extended', instruction: '' },
    });
    const transform = { scale: 0.2, rotationDeg: 17, originX: 0.5, originY: 0.6 };
    const raw = applyFrameTransform(canonical, transform);
    const recovered = toCanonicalFrame(raw);
    for (const name of HAND_LANDMARK_NAMES) {
      expect(recovered[name].x).toBeCloseTo(canonical[name].x, 5);
      expect(recovered[name].y).toBeCloseTo(canonical[name].y, 5);
    }
  });

  it('computeFrameTransform recovers the scale used to build a raw hand', () => {
    const canonical = buildReferenceLandmarks({
      thumb: { curl: 'extended', instruction: '' },
      index: { curl: 'extended', instruction: '' },
      middle: { curl: 'extended', instruction: '' },
      ring: { curl: 'extended', instruction: '' },
      pinky: { curl: 'extended', instruction: '' },
    });
    const raw = applyFrameTransform(canonical, { scale: 0.35, rotationDeg: 0, originX: 0.4, originY: 0.5 });
    const t = computeFrameTransform(raw);
    expect(t.scale).toBeCloseTo(0.35, 5);
  });
});

describe('Mudra registry', () => {
  it('contains exactly the ten mudras from the spec, each with a unique key', () => {
    expect(MUDRAS).toHaveLength(10);
    const keys = new Set(MUDRAS.map((m) => m.key));
    expect(keys.size).toBe(10);
  });

  it('builds a finite, well-formed reference pose for every mudra', () => {
    for (const mudra of MUDRAS) {
      const ref = referencePoseFor(mudra);
      expect(ref.tolerance).toBeGreaterThan(0);
      for (const name of HAND_LANDMARK_NAMES) {
        const p = ref.landmarks[name];
        expect(Number.isFinite(p.x)).toBe(true);
        expect(Number.isFinite(p.y)).toBe(true);
        expect(Number.isFinite(p.z)).toBe(true);
      }
    }
  });
});

describe('computeFormMatch (deterministic alignment engine)', () => {
  it('scores a perfect match at or near 100 with no adjust/reset corrections', () => {
    const gyan = MUDRAS.find((m) => m.key === 'gyan')!;
    const ref = referenceHandPoseFor(gyan, 'right');
    const tolerance = referencePoseFor(gyan).tolerance;
    const result = computeFormMatch(ref, ref, tolerance);
    expect(result.overall).toBeGreaterThanOrEqual(97);
    expect(result.corrections.filter((c) => c.severity !== 'good')).toHaveLength(0);
    expect(result.topCorrections).toHaveLength(0);
  });

  it('scores a fully open hand low against a closed-contact mudra and flags the broken contact', () => {
    const gyan = MUDRAS.find((m) => m.key === 'gyan')!;
    const ref = referenceHandPoseFor(gyan, 'right');
    const tolerance = referencePoseFor(gyan).tolerance;
    const openHand = buildReferenceHandPose(
      { ...gyan.fingers, thumb: { curl: 'extended', instruction: '' }, index: { curl: 'extended', instruction: '' } },
      'right',
    );
    const result = computeFormMatch(openHand, ref, tolerance);
    expect(result.overall).toBeLessThan(85);
    expect(result.topCorrections.length).toBeGreaterThan(0);
  });

  it('is a pure function — repeated calls with the same input return the same score', () => {
    const hakini = MUDRAS.find((m) => m.key === 'hakini')!;
    const ref = referenceHandPoseFor(hakini, 'right');
    const tolerance = referencePoseFor(hakini).tolerance;
    const a = computeFormMatch(ref, ref, tolerance);
    const b = computeFormMatch(ref, ref, tolerance);
    expect(a.overall).toBe(b.overall);
  });
});
