import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, PenLine, X } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Chip, Display, FadeIn, Mono, Panel, Voice } from '@/components/ui';
import { entriesForVirtue, weeklyVirtueReview } from '@/lib/agents/virtue';
import { useChakraStore } from '@/lib/store';
import { useVirtueStore } from '@/lib/virtueStore';
import { CROSS_FRAMEWORK_ASSOCIATIONS, VIRTUE_BY_KEY, type VirtueCategory } from '@/lib/virtues';
import { CHAKRA_BY_KEY } from '@/lib/chakras';

const ACCENT = '#c9a75c';
const WEEK_MS = 7 * 86_400_000;

const CATEGORY_LABEL: Record<VirtueCategory, string> = {
  theological: 'THEOLOGICAL VIRTUE',
  cardinal: 'CARDINAL VIRTUE',
  capital: 'CAPITAL VIRTUE',
};

export default function VirtueDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ virtue: string }>();
  const virtue = params.virtue ? VIRTUE_BY_KEY[params.virtue] : undefined;

  const entries = useChakraStore((s) => s.entries);
  const frameworks = useChakraStore((s) => s.frameworks);
  const hiddenVirtues = useVirtueStore((s) => s.hiddenVirtues);
  const setVirtueHidden = useVirtueStore((s) => s.setVirtueHidden);
  const practices = useVirtueStore((s) => s.practices);
  const logPractice = useVirtueStore((s) => s.logPractice);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/virtues');
  };

  const reflections = useMemo(
    () => (virtue ? entriesForVirtue(entries, virtue.key) : []),
    [entries, virtue],
  );
  const thisWeek = useMemo(
    () => reflections.filter((e) => e.createdAt > Date.now() - WEEK_MS),
    [reflections],
  );
  const practicesThisWeek = useMemo(
    () =>
      virtue
        ? practices.filter((p) => p.virtueKey === virtue.key && p.completedAt > Date.now() - WEEK_MS)
            .length
        : 0,
    [practices, virtue],
  );

  const review = useMemo(
    () =>
      virtue
        ? weeklyVirtueReview(virtue.key, { reflections: thisWeek.length, practices: practicesThisWeek })
        : null,
    [virtue, thisWeek.length, practicesThisWeek],
  );

  if (!virtue) {
    return (
      <View className="bg-field flex-1 items-center justify-center">
        <Text className="text-mute">Virtue not found.</Text>
      </View>
    );
  }

  const hidden = hiddenVirtues.includes(virtue.key);
  const association =
    frameworks.crossFrameworkLinks && frameworks.chakra ? CROSS_FRAMEWORK_ASSOCIATIONS[virtue.key] : undefined;

  const reflect = () => {
    close();
    router.navigate({
      pathname: '/(tabs)/journal',
      params: { virtue: virtue.key, prompt: review?.prompt ?? virtue.journalPrompts[0] },
    });
  };

  const loggedTextToday = (text: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return practices.some(
      (p) => p.virtueKey === virtue.key && p.practiceText === text && p.completedAt >= today.getTime(),
    );
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: ACCENT }}>{CATEGORY_LABEL[virtue.category]}</Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>
          <Display size={30} className="mt-1.5">
            {virtue.name}
          </Display>
          <Text className="text-mute mt-1.5" style={{ fontSize: 14, lineHeight: 20 }}>
            {virtue.description}
          </Text>

          <View className="mt-3 flex-row flex-wrap gap-1.5">
            {virtue.reflectionThemes.map((t) => (
              <Chip key={t} label={t} color={ACCENT} />
            ))}
          </View>

          {association ? (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/inspector/[chakra]', params: { chakra: association } })
              }
              className="mt-3"
              accessibilityRole="button"
            >
              <Panel className="flex-row items-center gap-2 p-3">
                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: CHAKRA_BY_KEY[association].color }} />
                <View className="flex-1">
                  <Text className="text-faint font-mono" style={{ fontSize: 7.5, letterSpacing: 1 }}>
                    CHAKRAOS EXPLORATORY ASSOCIATION
                  </Text>
                  <Text className="text-mute mt-0.5" style={{ fontSize: 12 }}>
                    {CHAKRA_BY_KEY[association].name} — a contemplative link, not historical doctrine.
                  </Text>
                </View>
              </Panel>
            </Pressable>
          ) : null}

          <View className="mt-6 flex-row gap-3">
            <Panel className="flex-1 p-3.5">
              <Mono>YOUR REFLECTIONS</Mono>
              <Text className="font-mono-bold mt-1" style={{ fontSize: 22, color: ACCENT }}>
                {reflections.length}
              </Text>
            </Panel>
            <Panel className="flex-1 p-3.5">
              <Mono>THIS WEEK</Mono>
              <Text className="font-mono-bold mt-1" style={{ fontSize: 22, color: '#e9ecf5' }}>
                {thisWeek.length} REFLECTION{thisWeek.length === 1 ? '' : 'S'}
              </Text>
            </Panel>
          </View>

          <Pressable
            onPress={reflect}
            className="mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
            style={{ backgroundColor: ACCENT }}
            accessibilityRole="button"
          >
            <PenLine color="#0a0e18" size={14} />
            <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
              REFLECT
            </Text>
          </Pressable>

          {virtue.scriptureReferences && virtue.scriptureReferences.length > 0 && frameworks.christianMode ? (
            <Text className="text-faint mt-3" style={{ fontSize: 10.5, lineHeight: 15 }}>
              Traditionally referenced: {virtue.scriptureReferences.join(' · ')}
            </Text>
          ) : null}

          <Mono className="mt-6 mb-2">PRACTICES · VOLUNTARY</Mono>
          <View className="gap-2">
            {virtue.practices.map((p) => {
              const done = loggedTextToday(p);
              return (
                <Pressable
                  key={p}
                  onPress={() => !done && logPractice(virtue.key, p)}
                  accessibilityRole="button"
                  accessibilityState={{ checked: done }}
                >
                  <Panel className="flex-row items-center gap-3 p-3.5">
                    <View
                      className="h-6 w-6 items-center justify-center rounded-full border"
                      style={{
                        borderColor: done ? ACCENT : '#1e2535',
                        backgroundColor: done ? `${ACCENT}22` : 'transparent',
                      }}
                    >
                      {done ? <Check color={ACCENT} size={13} /> : null}
                    </View>
                    <Text className="text-ink flex-1" style={{ fontSize: 13, lineHeight: 19 }}>
                      {p}
                    </Text>
                  </Panel>
                </Pressable>
              );
            })}
          </View>

          {reflections.length > 0 ? (
            <View className="mt-6">
              <Mono className="mb-2">RECENT REFLECTIONS</Mono>
              <View className="gap-2">
                {reflections.slice(0, 3).map((e, i) => (
                  <FadeIn key={e.id} index={i}>
                    <Panel className="p-3.5">
                      <Voice size={14}>{`"${e.body}"`}</Voice>
                    </Panel>
                  </FadeIn>
                ))}
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={() => setVirtueHidden(virtue.key, !hidden)}
            className="mt-6 self-start"
            accessibilityRole="button"
          >
            <Mono style={{ color: hidden ? ACCENT : '#565c72' }}>
              {hidden ? 'SHOW THIS VIRTUE AGAIN' : 'HIDE THIS VIRTUE FOR ME'}
            </Mono>
          </Pressable>

          <Text className="text-faint mt-6" style={{ fontSize: 10, lineHeight: 15 }}>
            Reflections and practices measure your own activity only — never your character,
            goodness, or spiritual standing.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
