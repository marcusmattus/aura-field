import { CameraView, type CameraType } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Hand } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { Text } from 'heroui-native';

import { Mono } from '@/components/ui';

/**
 * The camera layer behind the palm rig. A mirror, nothing more — no frame is
 * analysed, stored or uploaded. When permission is missing the rig still runs
 * over a quiet gradient so the visualisation is never blocked by the camera.
 */
export function PalmCamera({
  facing,
  active,
  granted,
  accent,
}: {
  facing: CameraType;
  active: boolean;
  granted: boolean;
  accent: string;
}) {
  if (granted && active) {
    return (
      <View style={StyleSheet.absoluteFill}>
        <CameraView style={StyleSheet.absoluteFill} facing={facing} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#05060abb' }]} />
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#0d1424', '#0a0e18', '#080b13']} style={StyleSheet.absoluteFill} />
      <View className="flex-1 items-center justify-end pb-6">
        <Hand color={`${accent}66`} size={20} />
        <Mono className="mt-2">CAMERA OFF</Mono>
        <Text className="text-faint mt-1 text-center" style={{ fontSize: 11, maxWidth: 220 }}>
          The palm map still runs without the feed.
        </Text>
      </View>
    </View>
  );
}
