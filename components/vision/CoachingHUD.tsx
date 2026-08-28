import { Check, RotateCcw, TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from 'heroui-native';

import type { Correction } from '@/lib/vision/MudraAlignment';

const SEVERITY: Record<Correction['severity'], { icon: typeof Check; color: string; label: string }> = {
  good: { icon: Check, color: '#3ddc97', label: 'GOOD' },
  adjust: { icon: TriangleAlert, color: '#e8b23d', label: 'ADJUST' },
  reset: { icon: RotateCcw, color: '#ff5c5c', label: 'RESET' },
};

/**
 * Real-time coaching — at most the two highest-priority corrections (spec
 * §8: "do not overwhelm the user with constant notifications"). When
 * everything is aligned, shows a single calm confirmation instead of a list.
 */
export function CoachingHUD({ corrections }: { corrections: Correction[] }) {
  if (corrections.length === 0) {
    return (
      <View className="flex-row items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#05060acc' }}>
        <Check color="#3ddc97" size={13} />
        <Text className="font-mono-bold" style={{ fontSize: 11, color: '#3ddc97', letterSpacing: 0.6 }}>
          ALIGNED
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-1.5 rounded-lg px-3 py-2" style={{ backgroundColor: '#05060acc' }}>
      {corrections.map((c) => {
        const meta = SEVERITY[c.severity];
        const Icon = meta.icon;
        return (
          <View key={c.code} className="flex-row items-center gap-2">
            <Icon color={meta.color} size={12} />
            <Text className="font-mono" style={{ fontSize: 10.5, color: meta.color, letterSpacing: 0.6 }}>
              {c.message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
