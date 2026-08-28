import { useRouter } from 'expo-router';
import { ChevronRight, Hand, ScanFace } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { Text } from 'heroui-native';

import { Mono, Panel } from '@/components/ui';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import { MUDRAS, mudraSessionsFor } from '@/lib/mudras';
import { useChakraStore } from '@/lib/store';

const ACCENT = '#36d6e7';

/** Mudras — the camera hand-position practice library, one shape per node. */
export function MudraPanel() {
  const router = useRouter();
  const sessions = useChakraStore((s) => s.sessions);

  return (
    <View className="px-4">
      <View className="flex-row items-center gap-2">
        <Hand color={ACCENT} size={14} />
        <Mono className="text-body">MUDRA VISION</Mono>
      </View>
      <Text className="text-faint mt-2" style={{ fontSize: 11, lineHeight: 17 }}>
        Pick a shape, hold it in front of the camera, close it with a sentence in the journal. The
        hold feeds the field, and the field is what Palm Field draws on your hand.
      </Text>
      <Text className="text-faint mt-2 font-mono" style={{ fontSize: 8.5, letterSpacing: 1 }}>
        PALM → POINT → MUDRA → HOLD → JOURNAL → FIELD
      </Text>

      <Pressable
        onPress={() => router.push('/mudras')}
        accessibilityRole="button"
        accessibilityLabel="Open Mudra Vision, camera hand alignment"
        className="mt-4"
      >
        <Panel className="flex-row items-center gap-3 border p-3.5" style={{ borderColor: `${ACCENT}55` }}>
          <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${ACCENT}1f` }}>
            <ScanFace color={ACCENT} size={16} />
          </View>
          <View className="flex-1">
            <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#e9ecf5' }}>
              Mudra Vision
            </Text>
            <Text className="text-mute mt-0.5" style={{ fontSize: 12, lineHeight: 17 }}>
              Camera alignment, real-time coaching, and a FORM MATCH score for the full mudra
              library.
            </Text>
          </View>
          <ChevronRight color={ACCENT} size={16} />
        </Panel>
      </Pressable>

      <Mono className="mt-5">SIMPLE HOLD PRACTICE</Mono>
      <View className="mt-2 gap-2">
        {MUDRAS.map((m) => {
          const def = CHAKRA_BY_KEY[m.chakra];
          const holds = mudraSessionsFor(m.chakra, sessions).length;
          return (
            <Pressable
              key={m.key}
              onPress={() => router.push({ pathname: '/mudra/[key]', params: { key: m.key } })}
              accessibilityRole="button"
              accessibilityLabel={`${m.name} mudra for ${def.name}`}
            >
              <Panel className="flex-row items-center gap-3 p-3.5">
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${def.color}1f` }}
                >
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: def.color, opacity: 0.9 }}
                  />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="text-ink"
                      style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 15 }}
                    >
                      {m.name}
                    </Text>
                    <Text className="text-faint" style={{ fontSize: 11 }}>
                      {m.sanskrit}
                    </Text>
                  </View>
                  <Text
                    className="text-faint mt-0.5 font-mono"
                    style={{ fontSize: 8, letterSpacing: 1 }}
                  >
                    {def.name.toUpperCase()} · {def.solfeggioHz} HZ ·{' '}
                    {holds === 0 ? 'NO HOLDS YET' : `${holds} HOLD${holds > 1 ? 'S' : ''}`}
                  </Text>
                  <Text className="text-mute mt-1.5" style={{ fontSize: 12, lineHeight: 18 }}>
                    {m.intent}
                  </Text>
                </View>
                <ChevronRight color="#565c72" size={16} />
              </Panel>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-faint mt-4" style={{ fontSize: 10, lineHeight: 15 }}>
        The camera is a mirror — line your hand up with the reference shape. chakraOS times the hold
        and folds it into the field. It does not grade your form or read your hand.
      </Text>
    </View>
  );
}
