import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from 'heroui-native';

import { AuraSigil } from '@/components/AuraSigil';
import { Display, Mono, SoftFade } from '@/components/ui';
import { CHAKRA_ORDER, SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';

interface Slide {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: 'CHAKRAOS · 01',
    title: 'A field that listens',
    body: 'Nine energetic nodes, mapped to how you actually feel. Each entry you write reshapes the living field in real time.',
    accent: SURFACE_ACCENT.body,
  },
  {
    eyebrow: 'CHAKRAOS · 02',
    title: 'Journal, scored',
    body: 'Write or speak freely. On-device analysis tags the themes and re-scores the nodes — no two days look the same.',
    accent: SURFACE_ACCENT.journal,
  },
  {
    eyebrow: 'CHAKRAOS · 03',
    title: 'Coach & frequency',
    body: 'A coach that cites your own data, and Solfeggio sound sessions tuned to the node that needs it most.',
    accent: SURFACE_ACCENT.sound,
  },
];

const PREVIEW_STATES = CHAKRA_ORDER.map((key, i) => ({
  key,
  energy: 38 + ((i * 53) % 60),
  trend7d: 0,
}));

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const completeOnboarding = useChakraStore((s) => s.completeOnboarding);

  const sigilSize = Math.min(width - 96, 260);
  const last = index === SLIDES.length - 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  const next = () => {
    if (last) {
      completeOnboarding();
      router.replace('/paywall');
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
  };

  const skip = () => {
    completeOnboarding();
    router.replace('/paywall');
  };

  const accent = SLIDES[index].accent;

  return (
    <View className="bg-field flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar `style` is a string enum, not a CSS object */}
      <StatusBar style="light" />

      <View className="pt-safe-offset-4 flex-row justify-end px-5">
        <Pressable hitSlop={12} onPress={skip}>
          <Mono>SKIP</Mono>
        </Pressable>
      </View>

      <View className="items-center py-6">
        <SoftFade>
          <AuraSigil states={PREVIEW_STATES} size={sigilSize} />
        </SoftFade>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        className="flex-1"
      >
        {SLIDES.map((s) => (
          <View key={s.title} style={{ width }} className="justify-center px-8">
            <Mono style={{ color: s.accent }}>{s.eyebrow}</Mono>
            <Display size={32} className="mt-3">
              {s.title}
            </Display>
            <Text className="text-mute mt-4" style={{ fontSize: 16, lineHeight: 25 }}>
              {s.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="pb-safe-offset-6 px-8">
        <View className="mb-6 flex-row justify-center gap-2">
          {SLIDES.map((s, i) => (
            <View
              key={s.title}
              className="h-1.5 rounded-full"
              style={{
                width: i === index ? 22 : 7,
                backgroundColor: i === index ? accent : '#1e2535',
              }}
            />
          ))}
        </View>

        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-full py-4"
          style={{ backgroundColor: accent }}
          onPress={next}
        >
          <Text className="font-mono-bold" style={{ fontSize: 13, color: '#0a0e18' }}>
            {last ? 'UNLOCK CHAKRAOS' : 'CONTINUE'}
          </Text>
          <ArrowRight color="#0a0e18" size={16} />
        </Pressable>
      </View>
    </View>
  );
}
