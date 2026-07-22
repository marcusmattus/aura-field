import { useRouter } from 'expo-router';
import {
  FastForward,
  PenLine,
  RefreshCw,
  Send,
  Waves,
  Wind,
} from 'lucide-react-native';
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
import Markdown from 'react-native-markdown-display';

import { Display, FadeIn, LockOverlay, Mono, Panel } from '@/components/ui';
import {
  CONVERSATION_MODES,
  MODE_LABELS,
  modeSystemPrompt,
  type ConversationMode,
} from '@/lib/ai/types';
import { SURFACE_ACCENT } from '@/lib/chakras';
import {
  appendMessage,
  createConversation,
  invokeFunction,
} from '@/lib/db';
import { hasBackend, supabase } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';
import type { CoachMessage, Protocol } from '@/lib/types';
import { coachRespond } from '@/lib/agents/coach';
import { analyzeEntry } from '@/lib/agents/awareness';

const ACCENT = SURFACE_ACCENT.coach;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CoachScreen() {
  const router = useRouter();
  const storeMessages = useChakraStore((s) => s.coachMessages);
  const setCoachMessages = useChakraStore((s) => s.setCoachMessages);
  const states = useChakraStore((s) => s.states);
  const entries = useChakraStore((s) => s.entries);
  const subscribed = useChakraStore((s) => s.subscribed);

  const [text, setText] = useState('');
  const [mode, setMode] = useState<ConversationMode>('general');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const greetedRef = useRef(false);
  const messages = storeMessages;

  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    if (!subscribed || greetedRef.current) return;
    if (messages.length > 0) {
      greetedRef.current = true;
      return;
    }
    greetedRef.current = true;
    setCoachMessages([
      {
        id: uid(),
        role: 'coach',
        content:
          'Welcome back. Take a breath — what feels most present in your field right now?',
        createdAt: Date.now(),
      },
    ]);
  }, [subscribed, messages.length, setCoachMessages]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, lastMessageContent]);

  const ensureConversation = async (): Promise<string | null> => {
    if (conversationId) return conversationId;
    if (!hasBackend) return null;
    try {
      const conv = await createConversation(mode, MODE_LABELS[mode]);
      setConversationId(conv.id);
      return conv.id;
    } catch {
      return null;
    }
  };

  const fieldSummary = states
    .map((s) => `${s.key}:${Math.round(s.energy)}`)
    .join(' ');

  const sendMessage = async (
    raw: string,
    opts?: { greet?: boolean; regenerate?: boolean; continue?: boolean },
  ) => {
    const userText = raw.trim();
    if (!opts?.greet && !opts?.regenerate && !opts?.continue && !userText) return;
    if (streaming) return;

    const now = Date.now();
    if (userText && !opts?.regenerate && !opts?.continue) {
      const userMsg: CoachMessage = {
        id: uid(),
        role: 'user',
        content: userText,
        createdAt: now,
      };
      setCoachMessages([...useChakraStore.getState().coachMessages, userMsg]);
    }

    setStreaming(true);
    const assistantId = uid();
    const placeholder: CoachMessage = {
      id: assistantId,
      role: 'coach',
      content: '',
      createdAt: Date.now(),
    };
    setCoachMessages([...useChakraStore.getState().coachMessages, placeholder]);

    const convId = await ensureConversation();
    if (convId && userText && !opts?.regenerate && !opts?.continue) {
      void appendMessage({ conversationId: convId, role: 'user', content: userText });
    }

    // Memory retrieval
    let memories: string[] = [];
    if (hasBackend && userText) {
      const { data: userData } = await supabase!.auth.getUser();
      if (userData.user) {
        const embed = await invokeFunction<{
          ok?: boolean;
          matches?: { summary: string }[];
        }>('ai-embed', {
          text: userText,
          userId: userData.user.id,
          match: true,
        });
        memories = (embed.data?.matches ?? []).map((m) => m.summary).filter(Boolean);
      }
    }

    const history = useChakraStore
      .getState()
      .coachMessages.filter((m) => m.id !== assistantId)
      .slice(-12)
      .map((m) => ({
        role: m.role === 'coach' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      }));

    const chatMessages = [
      { role: 'system' as const, content: modeSystemPrompt(mode) },
      ...history,
      ...(opts?.greet && !userText
        ? [{ role: 'user' as const, content: 'Greet me briefly and ask one gentle question.' }]
        : []),
      ...(opts?.continue
        ? [{ role: 'user' as const, content: 'Please continue your previous response.' }]
        : []),
    ];

    let streamed = '';
    const applyDelta = (delta: string) => {
      streamed += delta;
      setCoachMessages(
        useChakraStore.getState().coachMessages.map((m) =>
          m.id === assistantId ? { ...m, content: streamed } : m,
        ),
      );
    };

    let usedRemote = false;
    if (hasBackend) {
      const { streamCoachChat } = await import('@/lib/ai');
      await streamCoachChat(
        async (body) => {
          const { response } = await invokeFunction('ai-chat', {
            ...body,
            stream: true,
            regenerate: Boolean(opts?.regenerate),
            continue: Boolean(opts?.continue),
          });
          return response;
        },
        {
          messages: chatMessages,
          mode,
          memories,
          fieldSummary,
          regenerate: Boolean(opts?.regenerate),
        },
        {
          onDelta: (delta) => {
            usedRemote = true;
            applyDelta(delta);
          },
          onError: () => {
            usedRemote = false;
          },
        },
      );
    }

    if (!usedRemote || !streamed) {
      const distress = analyzeEntry(userText || 'hello', 'text').distress;
      const reply = coachRespond({
        userText: userText || 'hello',
        states,
        entries,
        distress,
        now: Date.now(),
      });
      streamed = reply.content;
      setCoachMessages(
        useChakraStore.getState().coachMessages.map((m) =>
          m.id === assistantId
            ? { ...m, content: reply.content, protocols: reply.protocols }
            : m,
        ),
      );
    }

    if (convId && streamed) {
      void appendMessage({
        conversationId: convId,
        role: 'assistant',
        content: streamed,
      });
    }

    // Fire-and-forget reflection / memory
    if (hasBackend && streamed) {
      const { data: userData } = await supabase!.auth.getUser();
      if (userData.user) {
        void invokeFunction('reflect', {
          userId: userData.user.id,
          sourceType: 'conversation',
          sourceId: convId,
          content: `User: ${userText}\nCoach: ${streamed}`,
          fieldScores: Object.fromEntries(states.map((s) => [s.key, s.energy])),
          period: 'interaction',
        });
      }
    }

    setStreaming(false);
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

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    void sendMessage(t);
  };

  const lastAssistant = [...messages].findLast((m) => m.role === 'coach');

  return (
    <KeyboardAvoidingView
      className="bg-field flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {!subscribed ? (
        <LockOverlay
          surface="COACH · FULL ACCESS"
          accent={ACCENT}
          title="Unlock the coach"
          body="Streaming reflection, conversation modes, and memory are part of membership."
        />
      ) : null}

      <View className="pt-safe px-4">
        <Mono className="text-coach mt-3">COACH</Mono>
        <Display size={26} className="mt-1">
          Reflection in motion
        </Display>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <View className="flex-row gap-2 pb-1">
            {CONVERSATION_MODES.slice(0, 10).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setMode(m);
                  setConversationId(null);
                }}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: mode === m ? ACCENT : '#141a28' }}
              >
                <Mono style={{ color: mode === m ? '#0a0e18' : '#8a90a6', fontSize: 10 }}>
                  {MODE_LABELS[m].toUpperCase()}
                </Mono>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
      >
        {messages.map((m) => (
          <FadeIn key={m.id}>
            <MessageBubble message={m} onProtocol={onProtocol} />
          </FadeIn>
        ))}
      </ScrollView>

      <View className="border-line border-t px-4 pb-safe pt-2">
        <View className="mb-2 flex-row gap-3">
          <Pressable
            hitSlop={8}
            disabled={streaming || !lastAssistant}
            onPress={() => void sendMessage('', { regenerate: true })}
            className="flex-row items-center gap-1"
          >
            <RefreshCw color="#8a90a6" size={14} />
            <Mono>REGENERATE</Mono>
          </Pressable>
          <Pressable
            hitSlop={8}
            disabled={streaming || !lastAssistant}
            onPress={() => void sendMessage('', { continue: true })}
            className="flex-row items-center gap-1"
          >
            <FastForward color="#8a90a6" size={14} />
            <Mono>CONTINUE</Mono>
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => router.push('/check-in')}
            className="flex-row items-center gap-1"
          >
            <PenLine color="#8a90a6" size={14} />
            <Mono>CHECK-IN</Mono>
          </Pressable>
        </View>
        <View className="flex-row items-end gap-2">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="What's present for you?"
            placeholderTextColor="#565c72"
            multiline
            className="bg-panel border-line text-ink max-h-28 flex-1 rounded-2xl border px-4 py-3"
            style={{ fontFamily: 'Inter_400Regular', fontSize: 15 }}
          />
          <Pressable
            onPress={submit}
            disabled={streaming}
            className="mb-1 h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: ACCENT, opacity: streaming ? 0.5 : 1 }}
          >
            <Send color="#0a0e18" size={18} />
          </Pressable>
        </View>
        <View className="mt-2 flex-row gap-3 pb-2">
          <QuickAction
            icon={<Waves color={ACCENT} size={14} />}
            label="Sound"
            onPress={() => router.push({ pathname: '/session', params: { chakra: 'heart' } })}
          />
          <QuickAction
            icon={<Wind color={ACCENT} size={14} />}
            label="Breath"
            onPress={() =>
              router.push({ pathname: '/session', params: { chakra: 'root', mode: 'breath' } })
            }
          />
        </View>
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
  return (
    <View className={isUser ? 'items-end' : 'items-start'}>
      <Panel
        className="max-w-[92%] px-3 py-2"
        style={isUser ? { backgroundColor: '#1a2234' } : undefined}
      >
        {isUser ? (
          <Text className="text-ink" style={{ fontSize: 15, lineHeight: 22 }}>
            {message.content}
          </Text>
        ) : (
          <Markdown
            style={{
              body: { color: '#e9ecf5', fontSize: 15, lineHeight: 22 },
              code_inline: {
                backgroundColor: '#0f1420',
                color: '#3ddc97',
                fontFamily: 'JetBrainsMono_400Regular',
              },
              fence: {
                backgroundColor: '#0f1420',
                color: '#c8d0e0',
                fontFamily: 'JetBrainsMono_400Regular',
                padding: 8,
                borderRadius: 8,
              },
              link: { color: ACCENT },
            }}
          >
            {message.content || '…'}
          </Markdown>
        )}
        {message.protocols?.length ? (
          <View className="mt-2 gap-2">
            {message.protocols.map((p) => (
              <Pressable
                key={p.key}
                onPress={() => onProtocol(p)}
                className="border-line rounded-xl border px-3 py-2"
              >
                <Mono style={{ color: ACCENT }}>{p.eyebrow}</Mono>
                <Text className="text-ink mt-1" style={{ fontSize: 14 }}>
                  {p.title}
                </Text>
                <Text className="text-mute" style={{ fontSize: 12 }}>
                  {p.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </Panel>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-1.5">
      {icon}
      <Mono>{label.toUpperCase()}</Mono>
    </Pressable>
  );
}
