import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Check, X } from 'lucide-react-native';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { AuraSigil } from '@/components/AuraSigil';
import { Display, Mono, Panel } from '@/components/ui';
import { CHAKRA_ORDER, SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.sound;

const PREVIEW_STATES = CHAKRA_ORDER.map((key, i) => ({
  key,
  energy: 44 + ((i * 47) % 55),
  trend7d: 0,
}));

const BENEFITS = [
  'Unlimited Coach conversations grounded in your own field data',
  'The full Solfeggio sound library — all nine tuned sessions',
  'Voice journaling with on-device theme analysis',
  'Aura sigil, breakthroughs & long-term field trends',
];

export default function PaywallScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const subscribe = useChakraStore((s) => s.subscribe);
  const subscribed = useChakraStore((s) => s.subscribed);

  const sigilSize = Math.min(width - 160, 180);

  const enter = () => {
    router.replace('/(tabs)');
  };

  const onSubscribe = () => {
    // NOTE: mock unlock — payments are not enabled. Replace with real IAP once on.
    subscribe();
    router.replace('/(tabs)');
  };

  return (
    <View className="bg-field flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar `style` is a string enum, not a CSS object */}
      <StatusBar style="light" />

      <View className="pt-safe-offset-3 flex-row justify-end px-5">
        <Pressable hitSlop={12} onPress={enter} className="flex-row items-center gap-1">
          <Mono>CONTINUE FREE</Mono>
          <X color="#8a90a6" size={14} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="items-center pt-2">
          <AuraSigil states={PREVIEW_STATES} size={sigilSize} />
        </View>

        <View className="px-6 pt-2">
          <Mono style={{ color: ACCENT }}>CHAKRAOS · FULL ACCESS</Mono>
          <Display size={30} className="mt-2">
            Open the whole field
          </Display>
          <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
            {subscribed
              ? 'You already have full access. Every surface is unlocked.'
              : 'Coach and Sound are limited on the free tier. Unlock everything with one membership.'}
          </Text>
        </View>

        <View className="mt-6 gap-3 px-6">
          {BENEFITS.map((b) => (
            <View key={b} className="flex-row items-start gap-3">
              <View
                className="mt-0.5 h-5 w-5 items-center justify-center rounded-full"
                style={{ backgroundColor: `${ACCENT}22` }}
              >
                <Check color={ACCENT} size={12} />
              </View>
              <Text className="text-ink flex-1" style={{ fontSize: 14, lineHeight: 21 }}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        <View className="mt-7 px-6">
          <Panel className="border-2 p-5" style={{ borderColor: ACCENT }}>
            <View className="flex-row items-center justify-between">
              <View>
                <Mono style={{ color: ACCENT }}>ANNUAL MEMBERSHIP</Mono>
                <View className="mt-1.5 flex-row items-baseline gap-1">
                  <Display size={34}>$30</Display>
                  <Text className="text-mute font-mono" style={{ fontSize: 13 }}>
                    / year
                  </Text>
                </View>
              </View>
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: `${ACCENT}22` }}>
                <Text className="font-mono-bold" style={{ fontSize: 10, color: ACCENT }}>
                  ~$2.50 / MO
                </Text>
              </View>
            </View>
            <Text className="text-mute mt-3 font-mono" style={{ fontSize: 11, lineHeight: 17 }}>
              Auto-renews yearly. Cancel anytime in Settings — you keep access until the term ends.
            </Text>
          </Panel>
        </View>
      </ScrollView>

      <View className="pb-safe-offset-5 px-6 pt-3">
        <Pressable
          className="items-center justify-center rounded-full py-4"
          style={{ backgroundColor: ACCENT }}
          onPress={subscribed ? enter : onSubscribe}
        >
          <Text className="font-mono-bold" style={{ fontSize: 13, color: '#0a0e18' }}>
            {subscribed ? 'ENTER CHAKRAOS' : 'START MEMBERSHIP · $30/YR'}
          </Text>
        </Pressable>
        <Text
          className="text-faint mt-3 text-center font-mono"
          style={{ fontSize: 10, lineHeight: 15 }}
        >
          Recurring billing. Cancel anytime. Terms apply.
        </Text>
      </View>
    </View>
  );
}
