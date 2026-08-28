import { useRouter } from 'expo-router';
import { ChevronRight, Compass } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { computePracticeIndex, entriesForVirtue } from '@/lib/agents/virtue';
import { useChakraStore } from '@/lib/store';
import { useVirtueStore } from '@/lib/virtueStore';
import { virtuesByCategory, visibleVirtues, type Virtue, type VirtueCategory } from '@/lib/virtues';

const ACCENT = '#c9a75c';

const CATEGORY_LABEL: Record<VirtueCategory, string> = {
  theological: 'THEOLOGICAL VIRTUES',
  cardinal: 'CARDINAL VIRTUES',
  capital: 'CAPITAL VIRTUES',
};

function scoreColor(score: number): string {
  if (score >= 60) return '#3ddc97';
  if (score >= 25) return '#e8b23d';
  return '#565c72';
}

function VirtueRow({ virtue, index }: { virtue: Virtue; index: number }) {
  const router = useRouter();
  const entries = useChakraStore((s) => s.entries);
  const practices = useVirtueStore((s) => s.practices);

  const score = useMemo(() => {
    const reflections = entriesForVirtue(entries, virtue.key).map((e) => e.createdAt);
    const practiceTimes = practices.filter((p) => p.virtueKey === virtue.key).map((p) => p.completedAt);
    return computePracticeIndex({ virtueKey: virtue.key, reflectionAt: reflections, practiceAt: practiceTimes, now: Date.now() });
  }, [entries, practices, virtue.key]);

  const reflectionCount = useMemo(() => entriesForVirtue(entries, virtue.key).length, [entries, virtue.key]);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/virtues/[virtue]', params: { virtue: virtue.key } })}
      accessibilityRole="button"
      accessibilityLabel={virtue.name}
    >
      <Panel className="flex-row items-center gap-3 p-3.5" style={index > 0 ? { marginTop: 8 } : undefined}>
        <View className="flex-1">
          <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#e9ecf5' }}>{virtue.name}</Text>
          <Text className="text-mute mt-0.5" style={{ fontSize: 12, lineHeight: 17 }}>
            {virtue.description}
          </Text>
          <Text className="text-faint mt-1 font-mono" style={{ fontSize: 8, letterSpacing: 1 }}>
            {reflectionCount === 0 ? 'NO REFLECTIONS YET' : `${reflectionCount} REFLECTION${reflectionCount > 1 ? 'S' : ''}`}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-mono-bold" style={{ fontSize: 18, color: scoreColor(score) }}>
            {score}
          </Text>
          <Text className="text-faint font-mono" style={{ fontSize: 7 }}>
            PRACTICE
          </Text>
        </View>
        <ChevronRight color="#565c72" size={16} />
      </Panel>
    </Pressable>
  );
}

/** Virtues — the reflection framework distinct from the chakra field.
 * Never ranks users; the practice index measures activity only. */
export default function VirtuesScreen() {
  const frameworks = useChakraStore((s) => s.frameworks);
  const hiddenVirtues = useVirtueStore((s) => s.hiddenVirtues);

  const visible = useMemo(
    () =>
      visibleVirtues({ virtueFramework: frameworks.virtue, christianMode: frameworks.christianMode }).filter(
        (v) => !hiddenVirtues.includes(v.key),
      ),
    [frameworks.virtue, frameworks.christianMode, hiddenVirtues],
  );
  const grouped = useMemo(() => virtuesByCategory(visible), [visible]);

  if (!frameworks.virtue) {
    return (
      <ScrollView className="bg-field flex-1">
        <View className="pt-safe-offset-4 px-5">
          <Mono style={{ color: ACCENT }}>VIRTUES</Mono>
          <Display size={26} className="mt-1.5">
            Framework is off
          </Display>
          <Panel className="mt-4 p-4">
            <Text className="text-mute" style={{ fontSize: 13, lineHeight: 19 }}>
              The Virtue framework is turned off in Settings. Turn it on to explore theological,
              cardinal, and capital virtues as an optional reflection practice.
            </Text>
          </Panel>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="bg-field flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="pt-safe-offset-4 px-5">
        <View className="flex-row items-center gap-2">
          <Compass color={ACCENT} size={16} />
          <Mono style={{ color: ACCENT }}>VIRTUES</Mono>
        </View>
        <Display size={28} className="mt-1.5">
          Your practice
        </Display>
        <Text className="text-mute mt-2" style={{ fontSize: 13, lineHeight: 20 }}>
          Choose what you want to cultivate. This is an optional reflection framework — not a
          ranking, and never a measure of moral worth.
        </Text>

        {(['theological', 'cardinal', 'capital'] as const).map((cat) =>
          grouped[cat].length > 0 ? (
            <View key={cat} className="mt-6">
              <Mono>{CATEGORY_LABEL[cat]}</Mono>
              <View className="mt-2">
                {grouped[cat].map((v, i) => (
                  <VirtueRow key={v.key} virtue={v} index={i} />
                ))}
              </View>
            </View>
          ) : null,
        )}

        <Text className="text-faint mt-6" style={{ fontSize: 10, lineHeight: 15 }}>
          The practice index reflects your own activity in the app — reflections and voluntary
          practices — never your character, goodness, or spiritual standing.
        </Text>
      </View>
    </ScrollView>
  );
}
