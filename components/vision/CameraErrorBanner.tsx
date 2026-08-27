import { AlertTriangle, Hand, Scan, SunDim, Users } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from 'heroui-native';

import type { TrackingStatus } from '@/lib/vision/types';

const COPY: Partial<Record<TrackingStatus, { icon: typeof Hand; title: string; body: string }>> = {
  no_hand: { icon: Hand, title: 'NO HAND DETECTED', body: 'Move your hand into frame.' },
  multiple_hands: { icon: Users, title: 'MULTIPLE HANDS', body: 'Show one hand at a time.' },
  low_light: { icon: SunDim, title: 'LOW LIGHT', body: 'Move to a brighter area.' },
  too_close: { icon: AlertTriangle, title: 'HAND TOO CLOSE', body: 'Move slightly back.' },
  too_far: { icon: AlertTriangle, title: 'HAND TOO FAR', body: 'Move closer to the camera.' },
  tracking_lost: { icon: Scan, title: 'TRACKING LOST', body: 'Return to the reference position.' },
};

/** Deterministic fallback states (spec §24) — the camera view never sits
 * empty. `status` of 'idle' or 'tracking' renders nothing. */
export function CameraErrorBanner({ status }: { status: TrackingStatus }) {
  const copy = COPY[status];
  if (!copy) return null;
  const Icon = copy.icon;
  return (
    <View className="absolute inset-0 items-center justify-center px-8">
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: '#e8b23d22' }}
      >
        <Icon color="#e8b23d" size={22} />
      </View>
      <Text className="font-mono-bold mt-3" style={{ fontSize: 12, color: '#e8b23d', letterSpacing: 1 }}>
        {copy.title}
      </Text>
      <Text className="text-faint mt-1.5 text-center" style={{ fontSize: 12, lineHeight: 17 }}>
        {copy.body}
      </Text>
    </View>
  );
}
