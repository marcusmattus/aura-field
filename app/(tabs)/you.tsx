import { format } from 'date-fns';
import { Settings } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { AuraSigil } from '@/components/AuraSigil';
import { FadeIn, Mono, Panel, SoftFade, Voice } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.you;

export default function YouScreen() {
  const { width } = useWindowDimensions();
  const states = useChakraStore((s) => s.states);
  const xp = useChakraStore((s) => s.xp);
  const level = useChakraStore((s) => s.level);
  const streak = useChakraStore((s) => s.streak);
  const breakthroughs = useChakraStore((s) => s.breakthroughs);
  const intention = useChakraStore((s) => s.intention);

  const intentionDay = useMemo(() => {
    const days = Math.floor((Date.now() - intention.startedAt) / 86_400_000) + 1;
    return Math.min(days, intention.totalDays);
  }, [intention]);

  return (
    <ScrollView
      className="bg-field flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-safe px-4">
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Mono className="text-you">PROFILE</Mono>
            <Text
              className="text-ink mt-1"
              style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 26 }}
            >
              Avani M.
            </Text>
          </View>
          <Pressable hitSlop={10}>
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
