import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { AttemptCompareTable, AttemptList } from '@/components/vision/AttemptCompareView';
import { useMudraVisionStore } from '@/lib/vision/mudraAlignmentStore';
import { MUDRA_BY_KEY, MUDRAS } from '@/lib/vision/MudraRegistry';

const ACCENT = '#36d6e7';

/**
 * Mudra comparison — every attempt recorded for a mudra, plus a side-by-side
 * breakdown between any two of them and the single biggest improvement.
 */
export default function MudraCompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mudra: string }>();
  const mudra = (params.mudra ? MUDRA_BY_KEY[params.mudra] : undefined) ?? MUDRAS[0];

  const sessions = useMudraVisionStore((s) => s.sessionsFor(mudra.key));
  const attempts = useMemo(
    () => sessions.flatMap((s) => s.attempts).sort((a, b) => a.capturedAt - b.capturedAt),
    [sessions],
  );

  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(Math.max(0, attempts.length - 1));

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/mudras');
  };

  const onSelect = (index: number) => {
    // Tapping always replaces whichever side is "older" so the pair stays
    // in chronological order (left = earlier attempt, right = later one).
    if (index === leftIndex || index === rightIndex) return;
    if (index < rightIndex) setLeftIndex(index);
    else setRightIndex(index);
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: ACCENT }}>MUDRA COMPARISON</Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>
          <Display size={26} className="mt-1.5">
            {mudra.name}
          </Display>

          {attempts.length === 0 ? (
            <Panel className="mt-5 p-4">
              <Text className="text-mute" style={{ fontSize: 13, lineHeight: 19 }}>
                No attempts recorded yet. Try this mudra with the camera to start comparing.
              </Text>
              <Pressable
                onPress={() => router.push({ pathname: '/mudras/camera', params: { mudra: mudra.key } })}
                className="mt-3 self-start rounded-xl px-4 py-2.5"
                style={{ backgroundColor: ACCENT }}
                accessibilityRole="button"
              >
                <Text className="font-mono-bold" style={{ fontSize: 11, color: '#0a0e18' }}>
                  TRY WITH CAMERA
                </Text>
              </Pressable>
            </Panel>
          ) : (
            <>
              <View className="mt-5">
                <AttemptList
                  attempts={attempts}
                  leftIndex={leftIndex}
                  rightIndex={rightIndex}
                  onSelect={onSelect}
                  accent={ACCENT}
                />
              </View>

              {attempts.length >= 2 ? (
                <View className="mt-6">
                  <Mono className="mb-2">BREAKDOWN</Mono>
                  <Panel className="p-4">
                    <AttemptCompareTable
                      left={attempts[leftIndex]}
                      right={attempts[rightIndex]}
                      leftLabel={`ATTEMPT ${String(attempts[leftIndex].attemptNumber).padStart(2, '0')}`}
                      rightLabel={`ATTEMPT ${String(attempts[rightIndex].attemptNumber).padStart(2, '0')}`}
                    />
                  </Panel>
                </View>
              ) : (
                <Text className="text-faint mt-5" style={{ fontSize: 12, lineHeight: 18 }}>
                  One attempt recorded so far. Practice again to unlock the side-by-side breakdown.
                </Text>
              )}
            </>
          )}

          <Text className="text-faint mt-6" style={{ fontSize: 10, lineHeight: 15 }}>
            A physical geometry comparison only — not a measure of progress in any spiritual or
            medical sense.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
