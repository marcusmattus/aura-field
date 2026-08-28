import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Mono, Panel } from '@/components/ui';
import { FINGERS } from '@/lib/vision/types';
import type { MudraAttemptRecord } from '@/lib/vision/mudraAlignmentStore';

const METRIC_ROWS: { key: string; label: string; get: (a: MudraAttemptRecord) => number }[] = [
  ...FINGERS.map((f) => ({
    key: f,
    label: f.toUpperCase(),
    get: (a: MudraAttemptRecord) => a.fingerScores[f] ?? 0,
  })),
  { key: 'palm', label: 'PALM', get: (a) => a.palmRotationScore },
  { key: 'spacing', label: 'SPACING', get: (a) => a.spacingScore },
];

function scoreColor(score: number): string {
  if (score >= 85) return '#3ddc97';
  if (score >= 55) return '#e8b23d';
  return '#ff5c5c';
}

/** Attempt-by-attempt score list, tap to select which two attempts appear in
 * the side-by-side breakdown below (spec §11). */
export function AttemptList({
  attempts,
  leftIndex,
  rightIndex,
  onSelect,
  accent,
}: {
  attempts: MudraAttemptRecord[];
  leftIndex: number;
  rightIndex: number;
  onSelect: (index: number) => void;
  accent: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {attempts.map((a, i) => {
        const selected = i === leftIndex || i === rightIndex;
        return (
          <Pressable
            key={a.attemptNumber}
            onPress={() => onSelect(i)}
            className="border-line items-center rounded-xl border px-4 py-3"
            style={{
              minWidth: 92,
              borderColor: selected ? `${accent}99` : '#1e2535',
              backgroundColor: selected ? `${accent}14` : 'transparent',
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Mono>ATTEMPT {String(a.attemptNumber).padStart(2, '0')}</Mono>
            <Text className="font-mono-bold mt-1" style={{ fontSize: 20, color: scoreColor(a.formScore) }}>
              {Math.round(a.formScore)}
            </Text>
            <Text className="text-faint font-mono" style={{ fontSize: 9 }}>
              / 100
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Side-by-side per-signal breakdown between two attempts, plus the biggest
 * single improvement — the two headline artifacts from spec §11. */
export function AttemptCompareTable({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: MudraAttemptRecord;
  right: MudraAttemptRecord;
  leftLabel: string;
  rightLabel: string;
}) {
  const rows = METRIC_ROWS.map((row) => ({
    label: row.label,
    left: row.get(left),
    right: row.get(right),
    delta: row.get(right) - row.get(left),
  }));
  const biggest = rows.reduce((max, r) => (Math.abs(r.delta) > Math.abs(max.delta) ? r : max), rows[0]);

  return (
    <View>
      <View className="flex-row items-center justify-between py-1.5">
        <Text className="text-faint font-mono" style={{ fontSize: 9, width: 90 }} />
        <Text className="text-faint font-mono" style={{ fontSize: 9, width: 56, textAlign: 'right' }}>
          {leftLabel}
        </Text>
        <Text className="text-faint font-mono" style={{ fontSize: 9, width: 56, textAlign: 'right' }}>
          {rightLabel}
        </Text>
      </View>
      {rows.map((r) => (
        <View key={r.label} className="border-line/60 flex-row items-center justify-between border-t py-2">
          <Text className="text-mute font-mono" style={{ fontSize: 10.5, width: 90 }}>
            {r.label}
          </Text>
          <Text className="font-mono-bold" style={{ fontSize: 12, color: scoreColor(r.left), width: 56, textAlign: 'right' }}>
            {Math.round(r.left)}%
          </Text>
          <Text className="font-mono-bold" style={{ fontSize: 12, color: scoreColor(r.right), width: 56, textAlign: 'right' }}>
            {Math.round(r.right)}%
          </Text>
        </View>
      ))}
      <View className="border-line/60 flex-row items-center justify-between border-t pt-2">
        <Text className="text-ink font-mono-bold" style={{ fontSize: 10.5, width: 90 }}>
          OVERALL
        </Text>
        <Text className="font-mono-bold" style={{ fontSize: 14, color: scoreColor(left.formScore), width: 56, textAlign: 'right' }}>
          {Math.round(left.formScore)}
        </Text>
        <Text className="font-mono-bold" style={{ fontSize: 14, color: scoreColor(right.formScore), width: 56, textAlign: 'right' }}>
          {Math.round(right.formScore)}
        </Text>
      </View>

      {Math.abs(biggest.delta) >= 1 ? (
        <Panel className="mt-4 p-3.5">
          <Mono>BIGGEST CHANGE</Mono>
          <Text className="text-ink mt-1" style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 16 }}>
            {biggest.label}
          </Text>
          <Text
            className="font-mono-bold mt-0.5"
            style={{ fontSize: 13, color: biggest.delta >= 0 ? '#3ddc97' : '#ff5c5c' }}
          >
            {biggest.delta >= 0 ? '+' : ''}
            {Math.round(biggest.delta)}%
          </Text>
        </Panel>
      ) : null}
    </View>
  );
}
