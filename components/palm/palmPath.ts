import { Skia, type SkPath } from '@shopify/react-native-skia';

import { palmOutlineFor } from '@/lib/palm';
import type { PalmHand } from '@/lib/types';

function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * The palm alignment outline as a smooth closed Skia path, scaled to a box.
 * Shared by Palm Field and the mudra hold guide so both draw the same hand.
 */
export function buildPalmOutlinePath(hand: PalmHand, width: number, height: number): SkPath {
  const pts = palmOutlineFor(hand).map(([x, y]) => ({ x: x * width, y: y * height }));
  const path = Skia.Path.Make();
  if (pts.length < 3) return path;
  const start = mid(pts[pts.length - 1], pts[0]);
  path.moveTo(start.x, start.y);
  for (let i = 0; i < pts.length; i += 1) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(cur, next);
    path.quadTo(cur.x, cur.y, m.x, m.y);
  }
  path.close();
  return path;
}
