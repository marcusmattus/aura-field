import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { Mic, Send } from 'lucide-react-native';
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

import { Chip, Display, Mono, Panel, Voice } from '@/components/ui';
import { CHAKRA_BY_KEY, isChakraKey, SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import type { JournalEntry } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.journal;

export default function JournalScreen() {
  const params = useLocalSearchParams();
  const entries = useChakraStore((s) => s.entries);
  const addEntry = useChakraStore((s) => s.addEntry);

  const [text, setText] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const rawSeed = params.seed;
  const seeded = isChakraKey(rawSeed) ? rawSeed : undefined;

  useEffect(() => {
    if (seeded && CHAKRA_BY_KEY[seeded]) {
      setText('');
      inputRef.current?.focus();
    }
  }, [seeded]);

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    void addEntry(body, voiceMode ? 'voice' : 'text', seeded);
    setText('');
  };

  const weekEntries = entries.filter((e) => e.createdAt > Date.now() - 7 * 86_400_000);

  return (
    <KeyboardAvoidingView
      className="bg-field flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-safe px-4">
          <Mono className="text-journal mt-3">JOURNAL</Mono>
          <Display size={26} className="mt-2">
            A single sentence
          </Display>
          <Display size={26}>is enough.</Display>

          {seeded && CHAKRA_BY_KEY[seeded] ? (
            <View className="mt-3">
              <Chip
                label={`Reflecting on ${CHAKRA_BY_KEY[seeded].name}`}
                color={CHAKRA_BY_KEY[seeded].color}
                filled
              />
            </View>
          ) : null}

          <Panel className="mt-4 p-4">
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="What are you noticing right now?"
              placeholderTextColor="#565c72"
              multiline
              className="text-ink"
              style={{
                fontFamily: 'Lora_400Regular_Italic',
                fontSize: 16,
                minHeight: 64,
                lineHeight: 24,
              }}
            />
            <View className="border-line mt-3 flex-row items-center justify-between border-t pt-3">
              <View className="flex-row gap-2">
                <Pressable onPress={() => setVoiceMode(false)}>
                  <View
                    className="rounded-md border px-3 py-1.5"
                    style={{
                      borderColor: voiceMode ? '#1e2535' : ACCENT,
                      backgroundColor: voiceMode ? 'transparent' : `${ACCENT}22`,
                    }}
                  >
                    <Mono style={{ color: voiceMode ? '#8a90a6' : ACCENT }}>TEXT</Mono>
                  </View>
                </Pressable>
                <Pressable onPress={() => setVoiceMode(true)}>
                  <View
                    className="flex-row items-center gap-1.5 rounded-md border px-3 py-1.5"
                    style={{
                      borderColor: voiceMode ? ACCENT : '#1e2535',
                      backgroundColor: voiceMode ? `${ACCENT}22` : 'transparent',
                    }}
                  >
                    <Mic color={voiceMode ? ACCENT : '#8a90a6'} size={11} />
                    <Mono style={{ color: voiceMode ? ACCENT : '#8a90a6' }}>VOICE</Mono>
                  </View>
                </Pressable>
              </View>
              <Pressable
                onPress={submit}
                disabled={!text.trim()}
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: text.trim() ? ACCENT : '#1e2535' }}
              >
                <Send color={text.trim() ? '#0a0e18' : '#565c72'} size={15} />
              </Pressable>
            </View>
            {voiceMode ? (
              <Text
                className="text-faint mt-2 font-mono"
                style={{ fontSize: 9, letterSpacing: 0.8 }}
              >
                TYPE WHAT YOU&apos;D SAY — TRANSCRIPTION ARRIVES WITH VOICE CAPTURE
              </Text>
            ) : null}
          </Panel>

          <View className="border-line mt-6 mb-2 flex-row items-center justify-between border-b pb-2">
            <Mono>THIS WEEK</Mono>
            <Mono>{weekEntries.length} ENTRIES</Mono>
          </View>
        </View>

        <View className="gap-3 px-4">
          {entries.length === 0 ? (
            <Panel className="p-5">
              <Text className="text-mute" style={{ fontFamily: 'Inter_400Regular', fontSize: 13 }}>
                The field is listening. Offer it one true sentence and watch a node move.
              </Text>
            </Panel>
          ) : (
            entries.map((entry) => <EntryCard key={entry.id} entry={entry} />)
          )}
        </View>

        <View className="mt-6 px-4">
          <Text
            className="text-faint text-center font-mono"
            style={{ fontSize: 9, letterSpacing: 0.8 }}
          >
            YOUR JOURNAL STAYS ON THIS DEVICE · NEVER USED TO TRAIN ANYTHING
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  return (
    <Panel className="p-4">
      <View className="flex-row items-center justify-between">
        <Mono>{format(new Date(entry.createdAt), 'EEE · d MMM').toUpperCase()}</Mono>
        <Mono>{format(new Date(entry.createdAt), 'h:mm a').toLowerCase()}</Mono>
      </View>
      <Voice className="mt-2">{`“${entry.body}”`}</Voice>
      {entry.tags.length > 0 || entry.themes.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {entry.tags.slice(0, 2).map((tag) => (
            <Chip
              key={`${tag.chakra}-${tag.theme}`}
              label={CHAKRA_BY_KEY[tag.chakra].name}
              color={CHAKRA_BY_KEY[tag.chakra].color}
            />
          ))}
          {entry.themes.slice(0, 1).map((theme) => (
            <Chip key={theme} label={theme} color="#8a90a6" />
          ))}
        </View>
      ) : null}
    </Panel>
  );
}
