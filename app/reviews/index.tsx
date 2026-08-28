import { format } from 'date-fns';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel, Voice } from '@/components/ui';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { useReviewStore } from '@/lib/reviewStore';
import type { ReviewPeriod } from '@/lib/types';

const ACCENT = '#a56bff';

/** Personal Growth Reports (M9) — weekly/monthly reviews built from the
 * same deterministic numbers as the rest of chakraOS, optionally narrated
 * by the reflect edge function; never dependent on it being reachable. */
export default function ReviewsScreen() {
  const [period, setPeriod] = useState<ReviewPeriod>('weekly');
  const reviews = useReviewStore((s) => s.reviewsFor(period));
  const generating = useReviewStore((s) => s.generating);
  const generateReview = useReviewStore((s) => s.generateReview);

  return (
    <ScrollView className="bg-field flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="pt-safe-offset-4 px-5">
        <View className="flex-row items-center gap-2">
          <Sparkles color={ACCENT} size={16} />
          <Mono style={{ color: ACCENT }}>REPORTS</Mono>
        </View>
        <Display size={28} className="mt-1.5">
          Personal growth
        </Display>
        <Text className="text-mute mt-2" style={{ fontSize: 13, lineHeight: 20 }}>
          A rollup of what happened, in your own field — never a claim about who you are.
        </Text>

        <View className="border-line mt-5 flex-row rounded-full border p-1">
          {(['weekly', 'monthly'] as const).map((p) => {
            const on = period === p;
            return (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                className="flex-1 items-center rounded-full py-2"
                style={{ backgroundColor: on ? `${ACCENT}1f` : 'transparent' }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Mono style={{ color: on ? ACCENT : '#565c72' }}>{p.toUpperCase()}</Mono>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => void generateReview(period)}
          disabled={generating}
          className="mt-4 flex-row items-center justify-center gap-2 rounded-xl py-3.5"
          style={{ backgroundColor: generating ? '#1e2535' : ACCENT }}
          accessibilityRole="button"
        >
          <Text className="font-mono-bold" style={{ fontSize: 12, color: generating ? '#565c72' : '#0a0e18' }}>
            {generating ? 'GENERATING…' : `GENERATE THIS ${period === 'weekly' ? 'WEEK' : 'MONTH'}'S REVIEW`}
          </Text>
        </Pressable>

        <View className="mt-6 gap-3">
          {reviews.length === 0 ? (
            <Panel className="p-4">
              <Text className="text-mute" style={{ fontSize: 13, lineHeight: 19 }}>
                No {period} reviews yet. Generate your first one above.
              </Text>
            </Panel>
          ) : (
            reviews.map((r) => (
              <Panel key={r.id} className="p-4">
                <View className="flex-row items-center justify-between">
                  <Mono>{format(new Date(r.createdAt), 'd MMM yyyy').toUpperCase()}</Mono>
                  <Mono>{r.stats.fieldIndexStart} → {r.stats.fieldIndexEnd}</Mono>
                </View>
                <Voice className="mt-2" size={14}>
                  {r.summary}
                </Voice>
                <View className="mt-3 flex-row flex-wrap gap-1.5">
                  {r.stats.topRisingChakra ? (
                    <View
                      className="rounded-full border px-2.5 py-1"
                      style={{ borderColor: `${CHAKRA_BY_KEY[r.stats.topRisingChakra].color}55` }}
                    >
                      <Text
                        className="font-mono"
                        style={{ fontSize: 9, color: CHAKRA_BY_KEY[r.stats.topRisingChakra].color }}
                      >
                        ↑ {CHAKRA_BY_KEY[r.stats.topRisingChakra].name.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                  {r.stats.topFallingChakra ? (
                    <View
                      className="rounded-full border px-2.5 py-1"
                      style={{ borderColor: `${CHAKRA_BY_KEY[r.stats.topFallingChakra].color}55` }}
                    >
                      <Text
                        className="font-mono"
                        style={{ fontSize: 9, color: CHAKRA_BY_KEY[r.stats.topFallingChakra].color }}
                      >
                        ↓ {CHAKRA_BY_KEY[r.stats.topFallingChakra].name.toUpperCase()}
                      </Text>
                    </View>
                  ) : null}
                  <View className="rounded-full border px-2.5 py-1" style={{ borderColor: '#1e2535' }}>
                    <Text className="text-faint font-mono" style={{ fontSize: 9 }}>
                      {r.stats.journalEntryCount} ENTRIES · {r.stats.habitsCompleted}/{r.stats.habitsScheduled} HABITS
                    </Text>
                  </View>
                </View>
              </Panel>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
