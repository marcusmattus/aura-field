import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Brain, MessageCircle, PenLine, User, Waves } from 'lucide-react-native';
import { type ComponentType } from 'react';

import { SURFACE_ACCENT } from '@/lib/chakras';
import type { SurfaceKey } from '@/lib/types';

interface TabDef {
  name: string;
  label: string;
  surface: SurfaceKey;
  icon: ComponentType<{ color: string; size: number }>;
}

const TABS: TabDef[] = [
  { name: 'index', label: 'Body', surface: 'body', icon: Brain },
  { name: 'journal', label: 'Journal', surface: 'journal', icon: PenLine },
  { name: 'coach', label: 'Coach', surface: 'coach', icon: MessageCircle },
  { name: 'sound', label: 'Sound', surface: 'sound', icon: Waves },
  { name: 'you', label: 'You', surface: 'you', icon: User },
];

export default function TabLayout() {
  return (
    <>
      {/* oxlint-disable-next-line react/style-prop-object -- StatusBar style is a string enum ("light"|"dark"), not RN StyleProp */}
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: '#0a0e18' },
          tabBarStyle: {
            backgroundColor: '#0a0e18',
            borderTopColor: '#1e2535',
            borderTopWidth: 1,
          },
          tabBarInactiveTintColor: '#565c72',
          tabBarLabelStyle: {
            fontFamily: 'JetBrainsMono_500Medium',
            fontSize: 9,
            letterSpacing: 0.5,
          },
        }}
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const accent = SURFACE_ACCENT[t.surface];
          return (
            <Tabs.Screen
              key={t.name}
              name={t.name}
              options={{
                title: t.label,
                tabBarActiveTintColor: accent,
                tabBarIcon: ({ focused, size }) => (
                  <Icon color={focused ? accent : '#565c72'} size={size ?? 22} />
                ),
              }}
            />
          );
        })}
      </Tabs>
    </>
  );
}
