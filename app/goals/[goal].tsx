import { useLocalSearchParams, useRouter } from 'expo-router';
import { Archive, Check, Plus, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel, Voice } from '@/components/ui';
import { HabitRow } from '@/components/goals/HabitRow';
import { computeGoalProgress } from '@/lib/agents/goalCoach';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { useGoalStore } from '@/lib/goalStore';
import type { HabitCadence } from '@/lib/types';

const ACCENT = '#3ddc97';

export default function GoalDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ goal: string }>();
  const goals = useGoalStore((s) => s.goals);
  const habits = useGoalStore((s) => s.habits);
  const habitEvents = useGoalStore((s) => s.habitEvents);
  const setGoalStatus = useGoalStore((s) => s.setGoalStatus);
  const createHabit = useGoalStore((s) => s.createHabit);

  const goal = goals.find((g) => g.id === params.goal);
  const linkedHabits = useMemo(() => habits.filter((h) => h.goalId === goal?.id && !h.archivedAt), [habits, goal]);
  const progress = useMemo(
    () => (goal ? computeGoalProgress(goal.id, habits, habitEvents, Date.now()) : null),
    [goal, habits, habitEvents],
  );

  const [habitTitle, setHabitTitle] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/goals');
  };

  if (!goal) {
    return (
      <View className="bg-field flex-1 items-center justify-center">
        <Text className="text-mute">Goal not found.</Text>
      </View>
    );
  }

  const addHabit = () => {
    const trimmed = habitTitle.trim();
    if (!trimmed) return;
    createHabit({ title: trimmed, cadence, goalId: goal.id });
    setHabitTitle('');
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono style={{ color: ACCENT }}>
              {goal.status === 'completed' ? 'COMPLETED GOAL' : goal.status === 'archived' ? 'ARCHIVED GOAL' : 'ACTIVE GOAL'}
            </Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>
          <Display size={28} className="mt-1.5">
            {goal.title}
          </Display>
          {goal.intention ? (
            <Voice className="mt-2" size={15}>
              {goal.intention}
            </Voice>
          ) : null}
          {goal.chakra ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CHAKRA_BY_KEY[goal.chakra].color }} />
              <Text className="text-faint font-mono" style={{ fontSize: 9, letterSpacing: 0.8 }}>
                {CHAKRA_BY_KEY[goal.chakra].name.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {progress && progress.activityScore !== null ? (
            <Panel className="mt-5 p-4">
              <Mono>30-DAY ACTIVITY</Mono>
              <Text className="font-mono-bold mt-1" style={{ fontSize: 26, color: ACCENT }}>
                {progress.activityScore}
              </Text>
              <Text className="text-faint mt-1" style={{ fontSize: 10, lineHeight: 15 }}>
                How often linked habits were completed against their cadence — activity only, not a
                verdict on the goal.
              </Text>
            </Panel>
          ) : null}

          {goal.status === 'active' ? (
            <View className="mt-4 flex-row gap-3">
              <Pressable
                onPress={() => setGoalStatus(goal.id, 'completed')}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3"
                style={{ backgroundColor: ACCENT }}
                accessibilityRole="button"
              >
                <Check color="#0a0e18" size={14} />
                <Text className="font-mono-bold" style={{ fontSize: 12, color: '#0a0e18' }}>
                  MARK COMPLETE
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setGoalStatus(goal.id, 'archived')}
                className="border-line items-center justify-center rounded-xl border px-4 py-3"
                accessibilityRole="button"
              >
                <Archive color="#8a90a6" size={14} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setGoalStatus(goal.id, 'active')}
              className="border-line mt-4 flex-row items-center justify-center gap-2 rounded-xl border py-3"
              accessibilityRole="button"
            >
              <Mono>REOPEN GOAL</Mono>
            </Pressable>
          )}

          <Mono className="mt-6 mb-2">LINKED HABITS</Mono>
          <View className="gap-2">
            {linkedHabits.length === 0 ? (
              <Text className="text-faint" style={{ fontSize: 12, lineHeight: 18 }}>
                No habits linked yet.
              </Text>
            ) : (
              linkedHabits.map((h) => <HabitRow key={h.id} habitId={h.id} />)
            )}
          </View>

          <Panel className="mt-3 p-3.5">
            <TextInput
              value={habitTitle}
              onChangeText={setHabitTitle}
              placeholder="Add a habit toward this goal…"
              placeholderTextColor="#565c72"
              className="text-ink"
              style={{ fontSize: 13 }}
              onSubmitEditing={addHabit}
              returnKeyType="done"
            />
            <View className="mt-3 flex-row items-center justify-between">
              <View className="flex-row gap-2">
                {(['daily', 'weekly'] as const).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCadence(c)}
                    className="rounded-md border px-2.5 py-1"
                    style={{
                      borderColor: cadence === c ? `${ACCENT}88` : '#1e2535',
                      backgroundColor: cadence === c ? `${ACCENT}1a` : 'transparent',
                    }}
                    accessibilityRole="button"
                  >
                    <Mono style={{ color: cadence === c ? ACCENT : '#8a90a6' }}>{c.toUpperCase()}</Mono>
                  </Pressable>
                ))}
              </View>
              <Pressable
                onPress={addHabit}
                disabled={!habitTitle.trim()}
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: habitTitle.trim() ? ACCENT : '#1e2535' }}
                accessibilityRole="button"
              >
                <Plus color={habitTitle.trim() ? '#0a0e18' : '#565c72'} size={16} />
              </Pressable>
            </View>
          </Panel>
        </View>
      </ScrollView>
    </View>
  );
}
