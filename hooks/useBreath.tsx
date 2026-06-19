import { useEffect } from 'react';
import {
  cancelAnimation,
  Easing,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useDerivedValue } from 'react-native-reanimated';

/**
 * A slow breathing oscillator (0..1) for Skia visuals. Returns a Reanimated
 * shared value driven on the UI thread. When reduced motion is on, it stays at
 * a static mid value (no breathing).
 */
export function useBreath(reduced: boolean) {
  const progress = useSharedValue(0.5);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(progress);
      progress.value = 0.5;
      return undefined;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [reduced, progress]);

  return useDerivedValue(() => progress.value);
}
