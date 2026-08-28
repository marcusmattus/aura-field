/**
 * Typed Supabase helpers for Goals & Habits (M9). See
 * supabase/migrations/20260827000003_goals_habits.sql.
 */

import { supabase } from '@/lib/supabase';
import type { ChakraKey, GoalStatus, HabitCadence } from '@/lib/types';

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.');
  return supabase;
}

async function requireUserId(): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated.');
  return data.user.id;
}

export interface GoalRow {
  id: string;
  title: string;
  intention: string;
  chakra_key: string | null;
  status: GoalStatus;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface HabitRow {
  id: string;
  goal_id: string | null;
  title: string;
  cadence: HabitCadence;
  archived_at: string | null;
  created_at: string;
}

export interface HabitEventRow {
  id: string;
  habit_id: string;
  completed_at: string;
}

export async function createGoal(input: {
  title: string;
  intention?: string;
  chakra?: ChakraKey;
  targetDate?: string;
}): Promise<GoalRow> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('goals')
    .insert({
      user_id: userId,
      title: input.title,
      intention: input.intention ?? '',
      chakra_key: input.chakra ?? null,
      target_date: input.targetDate ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as GoalRow;
}

export async function updateGoalStatus(id: string, status: GoalStatus): Promise<void> {
  const client = requireClient();
  const userId = await requireUserId();
  const { error } = await client
    .from('goals')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listGoals(): Promise<GoalRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as GoalRow[];
}

export async function createHabit(input: {
  title: string;
  cadence: HabitCadence;
  goalId?: string;
}): Promise<HabitRow> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('habits')
    .insert({ user_id: userId, title: input.title, cadence: input.cadence, goal_id: input.goalId ?? null })
    .select('*')
    .single();
  if (error) throw error;
  return data as HabitRow;
}

export async function listHabits(): Promise<HabitRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client.from('habits').select('*').eq('user_id', userId);
  if (error) throw error;
  return data as HabitRow[];
}

export async function logHabitEvent(habitId: string): Promise<HabitEventRow> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('habit_events')
    .insert({ user_id: userId, habit_id: habitId })
    .select('*')
    .single();
  if (error) throw error;
  return data as HabitEventRow;
}

export async function listHabitEvents(sinceMs?: number): Promise<HabitEventRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  let query = client.from('habit_events').select('*').eq('user_id', userId);
  if (sinceMs) query = query.gte('completed_at', new Date(sinceMs).toISOString());
  const { data, error } = await query;
  if (error) throw error;
  return data as HabitEventRow[];
}
