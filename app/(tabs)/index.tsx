import { useIsFocused } from '@react-navigation/native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { FieldPanel } from '@/components/body/FieldPanel';
import { MudraPanel } from '@/components/body/MudraPanel';
import { PalmPanel } from '@/components/body/PalmPanel';
import { Mono, Panel } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';

type BodyView = 'field' | 'palm' | 'mudras';

const ALL_VIEWS: { key: BodyView; label: string }[] = [
  { key: 'field', label: 'FIELD' },
  { key: 'palm', label: 'PALM' },
  { key: 'mudras', label: 'MUDRAS' },
];

/**
 * Body — the physical visualisation hub.
 * Field: the full-body nine-node channel. Palm: the camera palm chakra map.
 * Mudras: the camera hand-position practice.
 * Each tab honors its framework toggle in Settings (spec §52) — a user who
 * turns Mudra Practice off simply never sees it here.
 */
export default function BodyScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isFocused = useIsFocused();
  const fieldIndex = useChakraStore((s) => s.fieldIndex);
  const frameworks = useChakraStore((s) => s.frameworks);
  const [view, setView] = useState<BodyView>('field');

  const VIEWS = useMemo(
    () =>
      ALL_VIEWS.filter(
        (v) =>
          (v.key !== 'field' || frameworks.chakra) &&
          (v.key !== 'palm' || frameworks.palm) &&
          (v.key !== 'mudras' || frameworks.mudra),
      ),
    [frameworks.chakra, frameworks.palm, frameworks.mudra],
  );
  const activeView = VIEWS.some((v) => v.key === view) ? view : VIEWS[0]?.key;

  const contentWidth = Math.min(width - 32, 360);

  return (
    <ScrollView
      className="bg-field flex-1"
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-safe px-4">
        <View className="mt-3 flex-row items-start justify-between">
          <View>
            <Mono>TODAY · {format(new Date(), 'EEE').toUpperCase()}</Mono>
            <Text
              className="mt-1"
              style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 28, color: '#e9ecf5' }}
            >
              {format(new Date(), 'd MMM').toLowerCase()}
            </Text>
          </View>
          <View className="items-end gap-2">
            <Pressable
              onPress={() => router.push('/check-in')}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: SURFACE_ACCENT.body }}
              accessibilityRole="button"
            >
              <Mono style={{ color: '#0a0e18' }}>CHECK-IN</Mono>
            </Pressable>
            <View className="items-end">
              <Mono>FIELD INDEX</Mono>
              <View className="mt-1 flex-row items-baseline">
                <Text
                  className="font-mono-bold"
                  style={{ fontSize: 30, color: SURFACE_ACCENT.body }}
                >
                  {fieldIndex}
                </Text>
                <Text className="text-faint font-mono" style={{ fontSize: 12 }}>
                  /100
                </Text>
              </View>
            </View>
          </View>
        </View>

        {VIEWS.length > 1 ? (
          <View className="border-line mt-4 flex-row rounded-full border p-1">
            {VIEWS.map((v) => {
              const on = activeView === v.key;
              return (
                <Pressable
                  key={v.key}
                  onPress={() => setView(v.key)}
                  className="flex-1 items-center rounded-full py-2"
                  style={{ backgroundColor: on ? `${SURFACE_ACCENT.body}1f` : 'transparent' }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Mono style={{ color: on ? SURFACE_ACCENT.body : '#565c72' }}>{v.label}</Mono>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View className="mt-4">
        {activeView === 'field' ? <FieldPanel width={contentWidth} /> : null}
        {activeView === 'palm' ? (
          <PalmPanel width={Math.min(width - 32, 420)} active={isFocused} />
        ) : null}
        {activeView === 'mudras' ? <MudraPanel /> : null}
        {!activeView ? (
          <View className="px-4">
            <Panel className="p-4">
              <Text className="text-mute" style={{ fontSize: 13, lineHeight: 19 }}>
                Every Body framework is off. Turn one back on in Settings to see it here.
              </Text>
              <Pressable onPress={() => router.push('/settings')} className="mt-3 self-start" accessibilityRole="button">
                <Mono style={{ color: SURFACE_ACCENT.body }}>OPEN SETTINGS</Mono>
              </Pressable>
            </Panel>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
