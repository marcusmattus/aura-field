import { useRouter } from 'expo-router';
import { ChevronRight, Plus, Target } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { HabitRow } from '@/components/goals/HabitRow';
import { computeGoalProgress } from '@/lib/agents/goalCoach';
import { useGoalStore } from '@/lib/goalStore';
import type { HabitCadence } from '@/lib/types';

const ACCENT = '#3ddc97';

function GoalRow({ goalId }: { goalId: string }) {
  const router = useRouter();
  const goals = useGoalStore((s) => s.goals);
  const habits = useGoalStore((s) => s.habits);
  const habitEvents = useGoalStore((s) => s.habitEvents);
  const goal = goals.find((g) => g.id === goalId)!;
  const progress = useMemo(
    () => computeGoalProgress(goal.id, habits, habitEvents, Date.now()),
    [goal.id, habits, habitEvents],
  );

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/goals/[goal]', params: { goal: goal.id } })}
      accessibilityRole="button"
    >
      <Panel className="flex-row items-center gap-3 p-3.5">
        <View className="flex-1">
          <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: '#e9ecf5' }}>
            {goal.title}
          </Text>
          <Text className="text-faint mt-0.5" style={{ fontSize: 11 }}>
            {progress.habitsLinked === 0
              ? 'No habits linked yet'
              : `${progress.habitsLinked} linked habit${progress.habitsLinked > 1 ? 's' : ''}`}
          </Text>
        </View>
        {progress.activityScore !== null ? (
          <Text className="font-mono-bold" style={{ fontSize: 16, color: ACCENT }}>
            {progress.activityScore}
          </Text>
        ) : null}
        <ChevronRight color="#565c72" size={16} />
      </Panel>
    </Pressable>
  );
}

function AddHabitForm() {
  const createHabit = useGoalStore((s) => s.createHabit);
  const [title, setTitle] = useState('');
  const [cadence, setCadence] = useState<HabitCadence>('daily');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createHabit({ title: trimmed, cadence });
    setTitle('');
  };

  return (
    <Panel className="p-3.5">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="A habit worth showing up for…"
        placeholderTextColor="#565c72"
        className="text-ink"
        style={{ fontSize: 13 }}
        onSubmitEditing={submit}
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
          onPress={submit}
          disabled={!title.trim()}
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: title.trim() ? ACCENT : '#1e2535' }}
          accessibilityRole="button"
        >
          <Plus color={title.trim() ? '#0a0e18' : '#565c72'} size={16} />
        </Pressable>
      </View>
    </Panel>
  );
}

function AddGoalForm() {
  const createGoal = useGoalStore((s) => s.createGoal);
  const [title, setTitle] = useState('');
  const [intention, setIntention] = useState('');

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    createGoal({ title: trimmed, intention: intention.trim() });
    setTitle('');
    setIntention('');
  };

  return (
    <Panel className="p-3.5">
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="What are you working toward?"
        placeholderTextColor="#565c72"
        className="text-ink"
        style={{ fontSize: 13 }}
      />
      <TextInput
        value={intention}
        onChangeText={setIntention}
        placeholder="Why it matters (optional)"
        placeholderTextColor="#565c72"
        className="text-mute mt-2"
        style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 13 }}
      />
      <Pressable
        onPress={submit}
        disabled={!title.trim()}
        className="mt-3 flex-row items-center justify-center gap-2 self-start rounded-full px-4 py-2"
        style={{ backgroundColor: title.trim() ? ACCENT : '#1e2535' }}
        accessibilityRole="button"
      >
        <Plus color={title.trim() ? '#0a0e18' : '#565c72'} size={13} />
        <Text className="font-mono-bold" style={{ fontSize: 11, color: title.trim() ? '#0a0e18' : '#565c72' }}>
          ADD GOAL
        </Text>
      </Pressable>
    </Panel>
  );
}

/** Goals & Habits (M9) — voluntary practice tracking that feeds XP and the
 * weekly/monthly review, never a measure of worth for skipping a day. */
export default function GoalsScreen() {
  const goals = useGoalStore((s) => s.goals);
  const habits = useGoalStore((s) => s.habits);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const activeHabits = habits.filter((h) => !h.archivedAt);

  return (
    <ScrollView className="bg-field flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="pt-safe-offset-4 px-5">
        <View className="flex-row items-center gap-2">
          <Target color={ACCENT} size={16} />
          <Mono style={{ color: ACCENT }}>GOALS</Mono>
        </View>
        <Display size={28} className="mt-1.5">
          Your goals & habits
        </Display>
        <Text className="text-mute mt-2" style={{ fontSize: 13, lineHeight: 20 }}>
          Voluntary practice — a skipped day is just a day, never a failure.
        </Text>

        <Mono className="mt-6 mb-2">TODAY</Mono>
        <View className="gap-2">
          {activeHabits.length === 0 ? (
            <Text className="text-faint" style={{ fontSize: 12, lineHeight: 18 }}>
              No habits yet. Add one below.
            </Text>
          ) : (
            activeHabits.map((h) => <HabitRow key={h.id} habitId={h.id} />)
          )}
        </View>
        <View className="mt-3">
          <AddHabitForm />
        </View>

        <Mono className="mt-6 mb-2">GOALS</Mono>
        <View className="gap-2">
          {activeGoals.length === 0 ? (
            <Text className="text-faint" style={{ fontSize: 12, lineHeight: 18 }}>
              No active goals yet.
            </Text>
          ) : (
            activeGoals.map((g) => <GoalRow key={g.id} goalId={g.id} />)
          )}
        </View>
        <View className="mt-3">
          <AddGoalForm />
        </View>
      </View>
    </ScrollView>
  );
}
