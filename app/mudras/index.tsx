import { useRouter } from 'expo-router';
import { ChevronRight, Hand } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { useMudraVisionStore } from '@/lib/vision/mudraAlignmentStore';
import { MUDRAS, type MudraDifficulty } from '@/lib/vision/MudraRegistry';

const ACCENT = '#36d6e7';

const DIFFICULTY_COLOR: Record<MudraDifficulty, string> = {
  beginner: '#3ddc97',
  intermediate: '#e8b23d',
  advanced: '#ff5c8a',
};

/**
 * Mudra Vision library — browse every mudra, see how much practice each has,
 * and open the learning screen. The registry (lib/vision/MudraRegistry.ts)
 * is the single source of truth; nothing about a mudra is hardcoded here.
 */
export default function MudraLibraryScreen() {
  const router = useRouter();
  const progressFor = useMudraVisionStore((s) => s.progressFor);

  return (
    <ScrollView className="bg-field flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="pt-safe-offset-4 px-5">
        <View className="flex-row items-center gap-2">
          <Hand color={ACCENT} size={16} />
          <Mono className="text-body">MUDRA VISION</Mono>
        </View>
        <Display size={28} className="mt-1.5">
          Hand alignment
        </Display>
        <Text className="text-mute mt-2" style={{ fontSize: 13, lineHeight: 20 }}>
          Learn a mudra, see the reference shape, then hold it in front of the camera for real-time
          alignment feedback.
        </Text>

        <View className="mt-5 gap-2.5">
          {MUDRAS.map((mudra) => {
            const progress = progressFor(mudra.key);
            const chakras = mudra.traditionalAssociations.chakras;
            return (
              <Pressable
                key={mudra.key}
                onPress={() => router.push({ pathname: '/mudras/[mudra]', params: { mudra: mudra.key } })}
                accessibilityRole="button"
                accessibilityLabel={`${mudra.name}, ${mudra.difficulty}`}
              >
                <Panel className="p-4">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2">
                        <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#e9ecf5' }}>
                          {mudra.name}
                        </Text>
                        <Text className="text-faint" style={{ fontSize: 11 }}>
                          {mudra.sanskrit}
                        </Text>
                      </View>
                      <Text className="text-mute mt-1" style={{ fontSize: 12, lineHeight: 17 }}>
                        {mudra.description}
                      </Text>
                      <View className="mt-2 flex-row flex-wrap items-center gap-1.5">
                        <View
                          className="rounded-md px-1.5 py-0.5"
                          style={{ backgroundColor: `${DIFFICULTY_COLOR[mudra.difficulty]}22` }}
                        >
                          <Text
                            className="font-mono"
                            style={{ fontSize: 8, letterSpacing: 1, color: DIFFICULTY_COLOR[mudra.difficulty] }}
                          >
                            {mudra.difficulty.toUpperCase()}
                          </Text>
                        </View>
                        {chakras.map((c) => (
                          <View key={c} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHAKRA_BY_KEY[c].color }} />
                        ))}
                        {progress ? (
                          <Text className="text-faint font-mono" style={{ fontSize: 8, letterSpacing: 0.6 }}>
                            · BEST {Math.round(progress.bestFormScore)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <ChevronRight color="#565c72" size={16} />
                  </View>
                </Panel>
              </Pressable>
            );
          })}
        </View>

        <Text className="text-faint mt-5" style={{ fontSize: 10, lineHeight: 15 }}>
          Chakra associations are a traditional, reflective framework — never a medical or
          scientifically measured property. The camera only compares your hand&apos;s geometry to
          the selected reference pose.
        </Text>
      </View>
    </ScrollView>
  );
}
