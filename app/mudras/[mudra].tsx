import { useLocalSearchParams, useRouter } from 'expo-router';
import { GitCompareArrows, Play, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono } from '@/components/ui';
import { ReferenceHand } from '@/components/vision/ReferenceHand';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { useMudraVisionStore } from '@/lib/vision/mudraAlignmentStore';
import { isTwoHandMudra, MUDRA_BY_KEY, MUDRAS, referencePoseFor } from '@/lib/vision/MudraRegistry';
import type { FingerKey } from '@/lib/vision/types';
import type { Handedness } from '@/lib/vision/types';

const ACCENT = '#36d6e7';

function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** Groups fingers that share the exact same instruction text, so five nearly
 * identical "remain extended" lines collapse into one "OTHER FINGERS" row —
 * matching the spec's learning-screen mockup. */
function groupFingerInstructions(fingers: Record<FingerKey, { instruction: string }>) {
  const byText = new Map<string, FingerKey[]>();
  (Object.keys(fingers) as FingerKey[]).forEach((f) => {
    const text = fingers[f].instruction;
    byText.set(text, [...(byText.get(text) ?? []), f]);
  });
  return [...byText.entries()].map(([instruction, involved]) => ({
    heading: involved.length >= 3 ? 'OTHER FINGERS' : involved.map((f) => f.toUpperCase()).join(' + '),
    instruction,
  }));
}

/**
 * Mudra learning screen — the reference shape, per-finger instructions, the
 * traditional frame, and the entry point into the camera flow.
 */
export default function MudraLearnScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mudra: string }>();
  const mudra = (params.mudra ? MUDRA_BY_KEY[params.mudra] : undefined) ?? MUDRAS[0];
  const { width } = useWindowDimensions();
  const [hand, setHand] = useState<Handedness>('right');

  const referencePose = useMemo(() => referencePoseFor(mudra), [mudra]);
  const groups = useMemo(() => groupFingerInstructions(mudra.fingers), [mudra]);
  const progress = useMudraVisionStore((s) => s.progressFor(mudra.key));

  const handBoxSize = Math.min(width - 64, 280);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/mudras');
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: ACCENT }}>MUDRA</Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>

          <View className="mt-1 flex-row items-baseline gap-2">
            <Display size={30}>{mudra.name}</Display>
            <Text className="text-faint" style={{ fontSize: 14 }}>
              {mudra.sanskrit}
            </Text>
          </View>
          <Text className="text-mute mt-1" style={{ fontSize: 13, lineHeight: 19 }}>
            {mudra.description}
          </Text>

          <View className="mt-5 items-center">
            <ReferenceHand
              landmarks={referencePose.landmarks}
              hand={hand}
              width={handBoxSize}
              height={handBoxSize}
              color={ACCENT}
            />
            <View className="mt-2 flex-row gap-2">
              {(['left', 'right'] as const).map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setHand(h)}
                  className="border-line rounded-full border px-3 py-1.5"
                  style={{
                    borderColor: hand === h ? `${ACCENT}88` : '#1e2535',
                    backgroundColor: hand === h ? `${ACCENT}1a` : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: hand === h }}
                >
                  <Mono style={{ color: hand === h ? ACCENT : '#8a90a6' }}>{h.toUpperCase()} HAND</Mono>
                </Pressable>
              ))}
            </View>
            {isTwoHandMudra(mudra) ? (
              <Text className="text-faint mt-2 text-center" style={{ fontSize: 10, lineHeight: 15 }}>
                Traditionally practiced with both hands. Camera alignment tracks one hand&apos;s
                shape today — two-hand tracking is on the roadmap.
              </Text>
            ) : null}
          </View>

          <View className="mt-6 gap-4">
            {groups.map((g) => (
              <View key={g.heading}>
                <Mono style={{ color: ACCENT }}>{g.heading}</Mono>
                <Text className="text-ink mt-1" style={{ fontSize: 14, lineHeight: 20 }}>
                  {g.instruction}
                </Text>
              </View>
            ))}
          </View>

          <View className="border-line mt-6 border-t pt-5">
            <Mono>TRADITIONAL FRAME</Mono>
            <Text
              className="mt-2"
              style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 15, lineHeight: 22, color: '#c9cee0' }}
            >
              {mudra.traditionalAssociations.themes.join(' · ')}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {mudra.traditionalAssociations.chakras.map((c) => (
                <View
                  key={c}
                  className="flex-row items-center gap-1.5 rounded-full border px-2.5 py-1"
                  style={{ borderColor: `${CHAKRA_BY_KEY[c].color}55` }}
                >
                  <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHAKRA_BY_KEY[c].color }} />
                  <Text className="font-mono" style={{ fontSize: 9, letterSpacing: 0.8, color: CHAKRA_BY_KEY[c].color }}>
                    {CHAKRA_BY_KEY[c].name.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-faint mt-2" style={{ fontSize: 9.5, lineHeight: 14 }}>
              A traditional, reflective association — not a medical or scientifically measured
              property.
            </Text>
          </View>

          <View className="mt-6 flex-row items-center justify-between">
            <View>
              <Mono>RECOMMENDED</Mono>
              <Text className="font-mono-bold mt-1" style={{ fontSize: 22, color: ACCENT }}>
                {clock(mudra.recommendedDuration)}
              </Text>
            </View>
            {progress ? (
              <View className="items-end">
                <Mono>BEST MATCH</Mono>
                <Text className="font-mono-bold mt-1" style={{ fontSize: 22, color: '#3ddc97' }}>
                  {Math.round(progress.bestFormScore)}
                </Text>
              </View>
            ) : null}
          </View>

          <Pressable
            onPress={() =>
              router.push({ pathname: '/mudras/camera', params: { mudra: mudra.key, hand } })
            }
            className="mt-5 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
            style={{ backgroundColor: ACCENT }}
            accessibilityRole="button"
          >
            <Play color="#0a0e18" size={14} fill="#0a0e18" />
            <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
              TRY WITH CAMERA
            </Text>
          </Pressable>

          {progress ? (
            <Pressable
              onPress={() => router.push({ pathname: '/mudras/compare', params: { mudra: mudra.key } })}
              className="border-line mt-3 flex-row items-center justify-center gap-2 rounded-xl border py-3"
              accessibilityRole="button"
            >
              <GitCompareArrows color="#8a90a6" size={13} />
              <Mono>COMPARE ATTEMPTS</Mono>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
