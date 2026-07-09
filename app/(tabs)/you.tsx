import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Check, LogOut, Settings, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { AuraSigil } from '@/components/AuraSigil';
import { AuthSettings } from '@/components/AuthSettings';
import { FadeIn, Mono, Panel, SoftFade, Voice } from '@/components/ui';
import { SURFACE_ACCENT, CHAKRA_BY_KEY } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.you;

export default function YouScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const states = useChakraStore((s) => s.states);
  const xp = useChakraStore((s) => s.xp);
  const level = useChakraStore((s) => s.level);
  const streak = useChakraStore((s) => s.streak);
  const breakthroughs = useChakraStore((s) => s.breakthroughs);
  const intention = useChakraStore((s) => s.intention);
  const subscribed = useChakraStore((s) => s.subscribed);
  const renewsAt = useChakraStore((s) => s.subscriptionRenewsAt);
  const cancelSubscription = useChakraStore((s) => s.cancelSubscription);
  const profile = useChakraStore((s) => s.profile);
  const signOut = useChakraStore((s) => s.signOut);

  const displayName = profile?.displayName?.trim() || 'Seeker';
  const intentionDay = useMemo(() => {
    const days = Math.floor((Date.now() - intention.startedAt) / 86_400_000) + 1;
    return Math.min(days, intention.totalDays);
  }, [intention]);

  const onCancel = () => {
    if (Platform.OS === 'web') {
      cancelSubscription();
      return;
    }
    Alert.alert(
      'Cancel membership?',
      'You keep full access until the end of your current term, then revert to the free tier.',
      [
        { text: 'Keep membership', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: cancelSubscription },
      ],
    );
  };

  const onSignOut = () => {
    const run = () => {
      void signOut();
    };
    if (Platform.OS === 'web') {
      run();
      return;
    }
    Alert.alert(
      'Sign out?',
      'Your journey data stays on this device. You can sign back in anytime.',
      [
        { text: 'Stay signed in', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: run },
      ],
    );
  };

  return (
    <ScrollView
      className="bg-field flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-safe px-4">
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1">
            <Mono className="text-you">PROFILE</Mono>
            <Text
              className="text-ink mt-1"
              style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 26 }}
            >
              {displayName}
            </Text>
            {profile?.email ? (
              <Text className="text-faint font-mono" style={{ fontSize: 10, letterSpacing: 0.6 }}>
                {profile.email.toUpperCase()}
              </Text>
            ) : null}
          </View>
          <Pressable hitSlop={10} onPress={() => router.push('/profile-setup')}>
            <Settings color="#8a90a6" size={20} />
          </Pressable>
        </View>
      </View>

      <View className="mt-4 items-center">
        <SoftFade style={{ width: width - 32 }}>
          <Panel className="items-center py-6">
            <Mono className="mb-2">AURA SIGIL</Mono>
            <AuraSigil states={states} size={Math.min(width - 120, 240)} />
          </Panel>
        </SoftFade>
      </View>

      <View className="mt-4 flex-row gap-3 px-4">
        <StatCard label="XP TOTAL" value={xp.toLocaleString()} accent={ACCENT} />
        <StatCard label="STREAK" value={`${streak}`} unit="days" accent={ACCENT} />
        <StatCard label="LEVEL" value={level.toString().padStart(2, '0')} accent={ACCENT} />
      </View>

      <View className="mt-4 px-4">
        <Panel className="p-4">
          <View className="flex-row items-center justify-between">
            <Mono className="text-you">30-DAY INTENTION · DAY {intentionDay}</Mono>
            <Mono>{intention.totalDays - intentionDay} DAYS LEFT</Mono>
          </View>
          <Voice className="mt-3" size={16}>
            {`“${intention.text}”`}
          </Voice>
          <View className="bg-line mt-4 h-1 overflow-hidden rounded-full">
            <View
              className="h-full rounded-full"
              style={{
                width: `${(intentionDay / intention.totalDays) * 100}%`,
                backgroundColor: ACCENT,
              }}
            />
          </View>
          <Mono className="mt-2">
            {intentionDay} / {intention.totalDays}
          </Mono>
        </Panel>
      </View>

      {profile?.focusAreas && profile.focusAreas.length > 0 ? (
        <View className="mt-5 px-4">
          <Mono className="mb-2">FOCUS AREAS</Mono>
          <Panel className="flex-row flex-wrap gap-2 p-4">
            {profile.focusAreas.map((key: ChakraKey) => {
              const c = CHAKRA_BY_KEY[key];
              return (
                <View
                  key={key}
                  className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
                  style={{ borderColor: `${c.color}66`, backgroundColor: `${c.color}1a` }}
                >
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <Text className="font-mono" style={{ fontSize: 11, color: c.color }}>
                    {c.name.toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </Panel>
        </View>
      ) : null}

      <View className="mt-5 px-4">
        <Mono className="mb-2">MEMBERSHIP</Mono>
        {subscribed ? (
          <Panel className="p-4">
            <View className="flex-row items-center gap-3">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${ACCENT}22` }}
              >
                <Check color={ACCENT} size={16} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-ink"
                  style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }}
                >
                  Full access · active
                </Text>
                <Text className="text-mute font-mono" style={{ fontSize: 10 }}>
                  $30/yr
                  {renewsAt ? ` · renews ${format(new Date(renewsAt), 'd MMM yyyy')}` : ''}
                </Text>
              </View>
            </View>
            <Pressable className="mt-3 self-start" hitSlop={8} onPress={onCancel}>
              <Mono style={{ color: SURFACE_ACCENT.you }}>CANCEL MEMBERSHIP</Mono>
            </Pressable>
          </Panel>
        ) : (
          <Pressable onPress={() => router.push('/paywall')}>
            <Panel className="flex-row items-center gap-3 p-4">
              <View
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: `${ACCENT}22` }}
              >
                <Sparkles color={ACCENT} size={16} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-ink"
                  style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14 }}
                >
                  Unlock full access
                </Text>
                <Text className="text-mute font-mono" style={{ fontSize: 10 }}>
                  Coach + Sound · $30/yr · cancel anytime
                </Text>
              </View>
              <Mono style={{ color: ACCENT }}>OPEN</Mono>
            </Panel>
          </Pressable>
        )}
      </View>

      <View className="mt-5 px-4">
        <Mono className="mb-2">BREAKTHROUGHS</Mono>
        <View className="gap-2">
          {breakthroughs.length === 0 ? (
            <Panel className="p-4">
              <Text className="text-faint" style={{ fontFamily: 'Inter_400Regular', fontSize: 12 }}>
                The Oracle is watching for harmonics. Keep tending the field.
              </Text>
            </Panel>
          ) : (
            breakthroughs.map((b, i) => (
              <FadeIn key={b.id} index={i}>
                <Panel className="flex-row items-center gap-3 p-3">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                  <Mono className="w-16">
                    {format(new Date(b.occurredAt), 'd MMM').toUpperCase()}
                  </Mono>
                  <Text
                    className="text-ink flex-1"
                    style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}
                  >
                    {b.label}
                  </Text>
                </Panel>
              </FadeIn>
            ))
          )}
        </View>
      </View>

      {/* Authentication Settings */}
      <View className="mt-6 px-4">
        <Mono className="mb-3">ACCOUNT & SETTINGS</Mono>
        <AuthSettings />
      </View>

      <View className="mt-6 px-4">
        <Text
          className="text-faint text-center font-mono"
          style={{ fontSize: 9, letterSpacing: 0.8 }}
        >
          A REFLECTIVE TOOL · NOT MEDICAL OR THERAPEUTIC ADVICE
        </Text>
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent: string;
}) {
  return (
    <Panel className="flex-1 p-3">
      <Mono style={{ fontSize: 9 }}>{label}</Mono>
      <View className="mt-1 flex-row items-baseline gap-1">
        <Text className="font-mono-bold" style={{ fontSize: 22, color: accent }}>
          {value}
        </Text>
        {unit ? (
          <Text className="text-faint font-mono" style={{ fontSize: 10 }}>
            {unit}
          </Text>
        ) : null}
      </View>
    </Panel>
  );
}
