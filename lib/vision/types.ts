/**
 * Shared hand-tracking types for chakraOS Vision.
 *
 * `HandTrackingEngine` (see HandTrackingEngine.ts) is the single pipeline both
 * Palm Field and Mudra Vision consume: Camera -> PoseSource -> Landmarks ->
 * Normalized Pose -> feature-specific consumers. Nothing in this module reads
 * or infers anything about the user beyond the physical position of their
 * hand in front of the camera.
 */

/** A single tracked point. x/y are normalized to the camera frame (0..1);
 * z is a relative depth estimate (more negative = closer to the camera). In
 * a *normalized* HandPose, x/y/z are instead hand-relative units (see
 * PoseNormalizer). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** 21-point hand topology (wrist + 4 joints per finger), matching the
 * de-facto standard used by on-device hand landmark models so a real
 * detector can be dropped in without reshaping downstream code. */
export const HAND_LANDMARK_NAMES = [
  'wrist',
  'thumbCmc',
  'thumbMcp',
  'thumbIp',
  'thumbTip',
  'indexMcp',
  'indexPip',
  'indexDip',
  'indexTip',
  'middleMcp',
  'middlePip',
  'middleDip',
  'middleTip',
  'ringMcp',
  'ringPip',
  'ringDip',
  'ringTip',
  'pinkyMcp',
  'pinkyPip',
  'pinkyDip',
  'pinkyTip',
] as const;

export type HandLandmarkName = (typeof HAND_LANDMARK_NAMES)[number];

export type FingerKey = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export const FINGERS: readonly FingerKey[] = ['thumb', 'index', 'middle', 'ring', 'pinky'];

/** Joint indices (into HAND_LANDMARK_NAMES) that make up one finger, base to tip. */
export const FINGER_JOINTS: Record<FingerKey, readonly HandLandmarkName[]> = {
  thumb: ['wrist', 'thumbCmc', 'thumbMcp', 'thumbIp', 'thumbTip'],
  index: ['wrist', 'indexMcp', 'indexPip', 'indexDip', 'indexTip'],
  middle: ['wrist', 'middleMcp', 'middlePip', 'middleDip', 'middleTip'],
  ring: ['wrist', 'ringMcp', 'ringPip', 'ringDip', 'ringTip'],
  pinky: ['wrist', 'pinkyMcp', 'pinkyPip', 'pinkyDip', 'pinkyTip'],
};

export const FINGERTIP: Record<FingerKey, HandLandmarkName> = {
  thumb: 'thumbTip',
  index: 'indexTip',
  middle: 'middleTip',
  ring: 'ringTip',
  pinky: 'pinkyTip',
};

export const FINGER_MCP: Record<FingerKey, HandLandmarkName> = {
  thumb: 'thumbMcp',
  index: 'indexMcp',
  middle: 'middleMcp',
  ring: 'ringMcp',
  pinky: 'pinkyMcp',
};

/** A full set of 21 landmarks keyed by joint name. */
export type LandmarkSet = Record<HandLandmarkName, Landmark>;

export type Handedness = 'left' | 'right';

/** A detected (or reference) contact between two fingertips / a fingertip and the palm. */
export interface ContactPoint {
  a: FingerKey;
  b: FingerKey | 'palm';
  /** normalized distance between the two points, hand-relative units */
  distance: number;
}

/** The camera-measured hand pose for one frame, already run through PoseNormalizer. */
export interface HandPose {
  /** canonical, hand-relative landmarks (wrist at origin, unit scale) — what
   * every alignment computation runs on */
  landmarks: LandmarkSet;
  /** the same hand's landmarks in raw camera-space (0..1 image fraction) —
   * what the live skeleton overlay actually draws, since it has to sit on
   * top of the real camera feed at the hand's real position/scale/rotation */
  rawLandmarks: LandmarkSet;
  handedness: Handedness;
  /** signed degrees, palm rotation about the camera axis, 0 = neutral upright */
  palmRotation: number;
  /** average bend (0 = straight, 1 = fully curled) per finger */
  fingerCurl: Record<FingerKey, number>;
  /** joint angle in degrees at the MCP/PIP midpoint, per finger */
  fingerAngles: Record<FingerKey, number>;
  /** fingertip-to-fingertip / fingertip-to-palm distances of interest */
  contactPoints: ContactPoint[];
  /** overall confidence of this frame's detection, 0..1 */
  confidence: number;
}

export type TrackingStatus =
  | 'idle'
  | 'tracking'
  | 'no_hand'
  | 'multiple_hands'
  | 'low_light'
  | 'too_close'
  | 'too_far'
  | 'tracking_lost';

/** One emitted frame from a PoseSource. `pose` is only present when status is 'tracking'. */
export interface TrackingFrame {
  status: TrackingStatus;
  pose: HandPose | null;
  timestamp: number;
}

/**
 * Abstraction over "wherever hand landmarks come from". The engine (and every
 * feature built on it) only ever talks to this interface, so a real on-device
 * detector can be substituted for the bundled SimulatedPoseSource with no
 * changes anywhere else. See PoseSource.ts.
 */
export interface PoseSource {
  start(): Promise<void> | void;
  stop(): void;
  subscribe(cb: (frame: TrackingFrame) => void): () => void;
}
