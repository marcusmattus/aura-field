import { Check, Flame } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'heroui-native';

import { Panel } from '@/components/ui';
import { computeHabitProgress } from '@/lib/agents/goalCoach';
import { useGoalStore } from '@/lib/goalStore';

const ACCENT = '#3ddc97';

/** One habit's today/this-week checkbox + streak — shared by /goals and
 * /goals/[goal] so the completion logic lives in exactly one place. */
export function HabitRow({ habitId }: { habitId: string }) {
  const habits = useGoalStore((s) => s.habits);
  const habitEvents = useGoalStore((s) => s.habitEvents);
  const logHabit = useGoalStore((s) => s.logHabit);
  const habit = habits.find((h) => h.id === habitId);
  const progress = useMemo(
    () => (habit ? computeHabitProgress(habit, habitEvents, Date.now()) : null),
    [habit, habitEvents],
  );

  if (!habit || !progress) return null;

  return (
    <Pressable
      onPress={() => !progress.completedThisPeriod && logHabit(habit.id)}
      accessibilityRole="button"
      accessibilityState={{ checked: progress.completedThisPeriod }}
    >
      <Panel className="flex-row items-center gap-3 p-3.5">
        <View
          className="h-6 w-6 items-center justify-center rounded-full border"
          style={{
            borderColor: progress.completedThisPeriod ? ACCENT : '#1e2535',
            backgroundColor: progress.completedThisPeriod ? `${ACCENT}22` : 'transparent',
          }}
        >
          {progress.completedThisPeriod ? <Check color={ACCENT} size={13} /> : null}
        </View>
        <View className="flex-1">
          <Text className="text-ink" style={{ fontSize: 13 }}>
            {habit.title}
          </Text>
          <Text className="text-faint font-mono mt-0.5" style={{ fontSize: 8, letterSpacing: 1 }}>
            {habit.cadence.toUpperCase()}
          </Text>
        </View>
        {progress.streak > 0 ? (
          <View className="flex-row items-center gap-1">
            <Flame color="#e8b23d" size={12} />
            <Text className="font-mono-bold" style={{ fontSize: 12, color: '#e8b23d' }}>
              {progress.streak}
            </Text>
          </View>
        ) : null}
      </Panel>
    </Pressable>
  );
}
