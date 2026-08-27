import { View } from 'react-native';
import { Text } from 'heroui-native';

import { Mono } from '@/components/ui';
import type { FormMatchResult } from '@/lib/vision/MudraAlignment';

function scoreColor(score: number): string {
  if (score >= 85) return '#3ddc97';
  if (score >= 55) return '#e8b23d';
  return '#ff5c5c';
}

function Row({ label, score }: { label: string; score: number }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-mute font-mono" style={{ fontSize: 10.5, letterSpacing: 0.8 }}>
        {label}
      </Text>
      <View className="flex-1 mx-3 h-1 rounded-full" style={{ backgroundColor: '#1e2535' }}>
        <View
          className="h-1 rounded-full"
          style={{ width: `${Math.max(2, score)}%`, backgroundColor: scoreColor(score) }}
        />
      </View>
      <Text className="font-mono-bold" style={{ fontSize: 11, color: scoreColor(score), width: 34, textAlign: 'right' }}>
        {Math.round(score)}%
      </Text>
    </View>
  );
}

/** FORM MATCH 0-100 plus the deterministic per-signal breakdown from spec §7.
 * Never presented as health, consciousness, or spiritual measurement — this
 * is camera-estimated geometric similarity to the reference pose, nothing
 * else. */
export function FormMatchPanel({ result, accent }: { result: FormMatchResult; accent: string }) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between">
        <Mono style={{ color: accent }}>FORM MATCH</Mono>
        <View className="flex-row items-baseline">
          <Text className="font-mono-bold" style={{ fontSize: 30, color: scoreColor(result.overall) }}>
            {result.overall}
          </Text>
          <Text className="text-faint font-mono" style={{ fontSize: 13 }}>
            {' '}
            / 100
          </Text>
        </View>
      </View>

      <View className="mt-2">
        {result.contactScores.map((c) => (
          <Row key={`${c.a}-${c.b}`} label={`${c.label} CONTACT`} score={c.score} />
        ))}
        {result.fingerScores.map((f) => (
          <Row key={f.finger} label={`${f.finger.toUpperCase()} POSITION`} score={f.score} />
        ))}
        <Row label="PALM ROTATION" score={result.palmRotationScore} />
        <Row label="FINGER SPACING" score={result.spacingScore} />
      </View>

      <Text className="text-faint mt-3" style={{ fontSize: 9.5, lineHeight: 14 }}>
        Camera-estimated similarity to the reference pose only — not a measure of health,
        consciousness, or spiritual ability.
      </Text>
    </View>
  );
}
