import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Text } from 'heroui-native';

import { AuraSigil } from '@/components/AuraSigil';
import { BodyField } from '@/components/BodyField';
import { Chip, Display, Mono, Panel, SoftFade } from '@/components/ui';
import { todaysObservation } from '@/lib/agents/oracle';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import type { ChakraKey } from '@/lib/types';

export default function BodyScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const states = useChakraStore((s) => s.states);
  const fieldIndex = useChakraStore((s) => s.fieldIndex);

  const observation = useMemo(() => todaysObservation(states), [states]);
  const fieldWidth = Math.min(width - 32, 360);

  const onSelectNode = (key: ChakraKey) => {
    router.push({ pathname: '/inspector/[chakra]', params: { chakra: key } });
  };

  const onChip = (chip: (typeof observation.chips)[number]) => {
    if (chip.surface === 'sound' && chip.chakra) {
      router.push({ pathname: '/session', params: { chakra: chip.chakra } });
    } else {
      router.push('/coach');
    }
  };

  return (
    <ScrollView
      className="bg-field flex-1"
      contentContainerStyle={{ paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-safe px-4">
        <View className="mt-3 flex-row items-start justify-between">
          <View>
            <Mono>TODAY · {format(new Date(), 'EEE').toUpperCase()}</Mono>
            <Display size={28} className="mt-1">
              {format(new Date(), 'd MMM').toLowerCase()}
            </Display>
          </View>
          <View className="items-end">
            <Mono>FIELD INDEX</Mono>
            <View className="mt-1 flex-row items-baseline">
              <Text className="font-mono-bold" style={{ fontSize: 30, color: SURFACE_ACCENT.body }}>
                {fieldIndex}
              </Text>
              <Text className="text-faint font-mono" style={{ fontSize: 12 }}>
                /100
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View className="mt-4 items-center">
        <BodyField states={states} width={fieldWidth} onSelectNode={onSelectNode} />
      </View>

      <View className="mt-2 px-4">
        <SoftFade>
          <Panel className="p-4">
            <View className="flex-row items-center gap-2">
              <Sparkles color={SURFACE_ACCENT.body} size={14} />
              <Mono className="text-body">TODAY&apos;S OBSERVATION</Mono>
            </View>
            <Text
              className="text-ink mt-2"
              style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 }}
            >
              {observation.text}
            </Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {observation.chips.map((chip) => (
                <Pressable key={chip.label} onPress={() => onChip(chip)}>
                  <Chip
                    label={chip.label}
                    color={chip.surface === 'sound' ? SURFACE_ACCENT.sound : SURFACE_ACCENT.coach}
                  />
                </Pressable>
              ))}
            </View>
          </Panel>
        </SoftFade>
      </View>

      <View className="mt-4 px-4">
        <Mono className="mb-2">THE FIELD AS CONSTELLATION</Mono>
        <Panel className="items-center py-4">
          <AuraSigil states={states} size={Math.min(fieldWidth, 280)} />
        </Panel>
      </View>
    </ScrollView>
  );
}
