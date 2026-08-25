import { format } from 'date-fns';
import { View } from 'react-native';
import { Text } from 'heroui-native';

import { Mono, Panel } from '@/components/ui';
import { comparePalmScans } from '@/lib/palm';
import type { PalmScan } from '@/lib/types';

function DeltaValue({ delta }: { delta: number }) {
  const flat = delta === 0;
  const color = flat ? '#565c72' : delta > 0 ? '#36f5a6' : '#ff5c6e';
  return (
    <Text className="font-mono-bold" style={{ fontSize: 11, color, width: 42, textAlign: 'right' }}>
      {flat ? '—' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`}
    </Text>
  );
}

/**
 * Difference between the two most recent readings of the chakraOS palm
 * visualisation. Both columns are field state, not measurements of the hand.
 */
export function PalmCompare({ current, previous }: { current: PalmScan; previous: PalmScan }) {
  const rows = comparePalmScans(current, previous);

  return (
    <Panel className="p-4">
      <View className="flex-row items-end justify-between">
        <View>
          <Mono className="text-body">TODAY</Mono>
          <Text className="text-faint mt-0.5 font-mono" style={{ fontSize: 9 }}>
            {format(current.capturedAt, 'd MMM · HH:mm').toUpperCase()} ·{' '}
            {current.hand.toUpperCase()}
          </Text>
        </View>
        <View className="items-end">
          <Mono>PREVIOUS</Mono>
          <Text className="text-faint mt-0.5 font-mono" style={{ fontSize: 9 }}>
            {format(previous.capturedAt, 'd MMM · HH:mm').toUpperCase()} ·{' '}
            {previous.hand.toUpperCase()}
          </Text>
        </View>
      </View>

      <View className="mt-4 gap-2.5">
        {rows.map((row) => {
          const summary = row.key === 'field' || row.key === 'channel';
          return (
            <View key={row.key} className={summary ? 'border-line/70 border-t pt-2.5' : undefined}>
              <View className="flex-row items-center gap-2">
                <Text
                  className="font-mono"
                  style={{
                    fontSize: 9,
                    letterSpacing: 1,
                    width: 58,
                    color: summary ? '#c9cfe0' : '#8a90a6',
                  }}
                >
                  {row.label}
                </Text>
                <Text
                  className="font-mono-bold"
                  style={{ fontSize: 13, color: row.color, width: 26 }}
                >
                  {row.today}
                </Text>
                <View className="bg-line/70 h-1.5 flex-1 overflow-hidden rounded-full">
                  <View
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.min(100, row.today))}%`,
                      backgroundColor: row.color,
                      opacity: 0.9,
                    }}
                  />
                  <View
                    className="absolute top-0 h-full w-0.5"
                    style={{
                      left: `${Math.max(0, Math.min(99, row.previous))}%`,
                      backgroundColor: '#e9ecf5',
                      opacity: 0.7,
                    }}
                  />
                </View>
                <Text className="text-faint font-mono" style={{ fontSize: 11, width: 22 }}>
                  {row.previous}
                </Text>
                <DeltaValue delta={row.delta} />
              </View>
            </View>
          );
        })}
      </View>

      <Text className="text-faint mt-4" style={{ fontSize: 10, lineHeight: 15 }}>
        The white marker is the previous scan. Both columns read chakraOS field state — the camera
        measures nothing.
      </Text>
    </Panel>
  );
}
