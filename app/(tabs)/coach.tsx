import { useRouter } from 'expo-router';
import { Mic, Send, Waves, Wind, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import type { CoachMessage, Protocol } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.coach;

export default function CoachScreen() {
  const router = useRouter();
  const messages = useChakraStore((s) => s.coachMessages);
  const send = useChakraStore((s) => s.sendCoachMessage);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    // greet once if empty
    if (messages.length === 0) {
      void send('');
    }
  }, [messages.length, send]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    void send(t);
    setText('');
  };

  const onProtocol = (p: Protocol) => {
    if (p.type === 'sound' && p.chakra) {
      router.push({ pathname: '/session', params: { chakra: p.chakra } });
    } else if (p.type === 'reflect') {
      router.push({ pathname: '/journal', params: { seed: p.chakra ?? '' } });
    } else if (p.type === 'breath' && p.chakra) {
      router.push({ pathname: '/session', params: { chakra: p.chakra, mode: 'breath' } });
    }
  };

  return (
    <KeyboardAvoidingView
      className="bg-field flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="pt-safe px-4">
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Mono className="text-coach">AWARENESS · MEMORY · FREQUENCY</Mono>
            <Display size={26} className="mt-1">
              Coach
            </Display>
          </View>
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ACCENT }} />
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        className="mt-3 flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onProtocol={onProtocol} />
        ))}
      </ScrollView>

      <View className="border-line bg-field pb-safe-offset-2 border-t px-4 pt-3">
        <Panel className="flex-row items-center gap-2 px-3 py-1.5">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask, or just notice…"
            placeholderTextColor="#565c72"
            className="text-ink flex-1"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 8 }}
            onSubmitEditing={submit}
          />
          <Pressable className="h-8 w-8 items-center justify-center">
            <Mic color="#565c72" size={16} />
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!text.trim()}
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: text.trim() ? ACCENT : '#1e2535' }}
          >
            <Send color={text.trim() ? '#0a0e18' : '#565c72'} size={14} />
          </Pressable>
        </Panel>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({
  message,
  onProtocol,
}: {
  message: CoachMessage;
  onProtocol: (p: Protocol) => void;
}) {
  const isUser = message.role === 'user';
  if (isUser) {
    return (
      <View className="items-end">
        <View
          className="max-w-[82%] rounded-2xl rounded-br-md px-4 py-2.5"
          style={{ backgroundColor: '#1a2233' }}
        >
          <Text
            className="text-ink"
            style={{ fontFamily: 'Lora_400Regular_Italic', fontSize: 14, lineHeight: 21 }}
          >
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="items-start gap-2">
      <Panel className="max-w-[88%] p-4">
        <Text
          className="text-ink"
          style={{ fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 }}
        >
          {message.content}
        </Text>
      </Panel>
      {message.protocols && message.protocols.length > 0 ? (
        <View className="w-full gap-2">
          <Mono className="mt-1">SUGGESTED · TAP TO BEGIN</Mono>
          {message.protocols.map((p) => (
            <ProtocolCard key={p.key} protocol={p} onPress={() => onProtocol(p)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ProtocolCard({ protocol, onPress }: { protocol: Protocol; onPress: () => void }) {
  const Icon = protocol.type === 'sound' ? Waves : protocol.type === 'breath' ? Wind : X;
  const color =
    protocol.type === 'sound'
      ? SURFACE_ACCENT.sound
      : protocol.type === 'breath'
        ? SURFACE_ACCENT.body
        : SURFACE_ACCENT.journal;
  return (
    <Pressable onPress={onPress}>
      <Panel className="flex-row items-center gap-3 p-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon color={color} size={16} />
        </View>
        <View className="flex-1">
          <Mono style={{ color, fontSize: 9 }}>{protocol.eyebrow}</Mono>
          <Text className="text-ink mt-0.5" style={{ fontFamily: 'Inter_500Medium', fontSize: 13 }}>
            {protocol.title}
          </Text>
          <Text className="text-faint" style={{ fontFamily: 'Inter_400Regular', fontSize: 11 }}>
            {protocol.subtitle}
          </Text>
        </View>
        <Text className="text-faint" style={{ fontSize: 18 }}>
          ›
        </Text>
      </Panel>
    </Pressable>
  );
}
