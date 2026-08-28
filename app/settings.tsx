import { useRouter } from 'expo-router';
import { Lock, X } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import type { FrameworkSettings } from '@/lib/store';
import { useChakraStore } from '@/lib/store';

const ACCENT = '#8a90a6';

function Toggle({ on, onToggle, accent }: { on: boolean; onToggle: () => void; accent: string }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      className="h-7 w-12 justify-center rounded-full px-0.5"
      style={{ backgroundColor: on ? `${accent}55` : '#1e2535' }}
    >
      <View
        className="h-6 w-6 rounded-full"
        style={{ backgroundColor: on ? accent : '#565c72', marginLeft: on ? 20 : 0 }}
      />
    </Pressable>
  );
}

interface FrameworkRow {
  key: keyof FrameworkSettings;
  label: string;
  description: string;
  accent: string;
  /** disabled unless a prerequisite framework is on */
  requires?: keyof FrameworkSettings;
}

const ROWS: FrameworkRow[] = [
  {
    key: 'chakra',
    label: 'Chakra Field',
    description: 'The nine-node body visualization and Field Index on the Body tab.',
    accent: '#36d6e7',
  },
  {
    key: 'mudra',
    label: 'Mudra Practice',
    description: 'Camera-based hand alignment practice under Body → Mudras.',
    accent: '#36d6e7',
  },
  {
    key: 'palm',
    label: 'Palm Field',
    description: 'The camera palm map under Body → Palm.',
    accent: '#36d6e7',
  },
  {
    key: 'virtue',
    label: 'Virtue Reflection',
    description: 'Theological, cardinal, and capital virtues as an optional practice framework.',
    accent: '#c9a75c',
  },
  {
    key: 'christianMode',
    label: 'Christian Reflection Mode',
    description: 'Adds Faith, Hope, and Charity, and optional scripture references. Off by default.',
    accent: '#c9a75c',
    requires: 'virtue',
  },
  {
    key: 'crossFrameworkLinks',
    label: 'Cross-Framework Links',
    description: 'Optional, clearly-labeled associations between virtues and chakra nodes.',
    accent: '#c9a75c',
    requires: 'virtue',
  },
];

/** Framework Controls (spec §52) — every framework is independently
 * toggleable, and nobody is defaulted into a spiritual or religious one. */
export default function SettingsScreen() {
  const router = useRouter();
  const frameworks = useChakraStore((s) => s.frameworks);
  const setFrameworkEnabled = useChakraStore((s) => s.setFrameworkEnabled);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/you');
  };

  return (
    <View className="bg-field flex-1">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="pt-safe-offset-4 px-5">
          <View className="flex-row items-start justify-between">
            <Mono>SETTINGS</Mono>
            <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
              <X color="#8a90a6" size={20} />
            </Pressable>
          </View>
          <Display size={26} className="mt-1.5">
            Frameworks
          </Display>
          <Text className="text-mute mt-2" style={{ fontSize: 13, lineHeight: 19 }}>
            Every framework below is optional. Turning one off hides it everywhere in the app —
            nothing is deleted, and you can turn it back on anytime.
          </Text>

          <View className="mt-5 gap-2.5">
            {ROWS.map((row) => {
              const requiresOn = !row.requires || frameworks[row.requires];
              const on = frameworks[row.key] && requiresOn;
              return (
                <Panel key={row.key} className="flex-row items-center gap-3 p-4" style={!requiresOn ? { opacity: 0.5 } : undefined}>
                  <View className="flex-1">
                    <Text style={{ fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: '#e9ecf5' }}>
                      {row.label}
                    </Text>
                    <Text className="text-faint mt-1" style={{ fontSize: 11.5, lineHeight: 16 }}>
                      {requiresOn ? row.description : `Requires ${ROWS.find((r) => r.key === row.requires)?.label} to be on.`}
                    </Text>
                  </View>
                  <Toggle
                    on={on}
                    onToggle={() => requiresOn && setFrameworkEnabled(row.key, !frameworks[row.key])}
                    accent={row.accent}
                  />
                </Panel>
              );
            })}
          </View>

          <Pressable onPress={() => router.push('/privacy')} className="mt-6" accessibilityRole="button">
            <Panel className="flex-row items-center gap-3 p-4">
              <Lock color={ACCENT} size={16} />
              <Text className="text-ink flex-1" style={{ fontSize: 13 }}>
                Privacy & data
              </Text>
            </Panel>
          </Pressable>

          <Pressable onPress={() => router.push('/profile-setup')} className="mt-2.5" accessibilityRole="button">
            <Panel className="flex-row items-center gap-3 p-4">
              <Text className="text-ink flex-1" style={{ fontSize: 13 }}>
                Edit profile
              </Text>
            </Panel>
          </Pressable>

          <Text className="text-faint mt-6 text-center font-mono" style={{ fontSize: 9, letterSpacing: 0.8 }}>
            A REFLECTIVE TOOL · NOT MEDICAL OR THERAPEUTIC ADVICE
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
