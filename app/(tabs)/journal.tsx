import { format } from 'date-fns';
import { useLocalSearchParams } from 'expo-router';
import { Check, Mic, Pencil, Send, Square, Trash2, X } from 'lucide-react-native';
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

import { Chip, Display, FadeIn, Mono, Panel, Voice } from '@/components/ui';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { CHAKRA_BY_KEY, isChakraKey, SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import type { JournalEntry } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.journal;

function fmtClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function JournalScreen() {
  const params = useLocalSearchParams();
  const entries = useChakraStore((s) => s.entries);
  const addEntry = useChakraStore((s) => s.addEntry);

  const [text, setText] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const rawSeed = params.seed;
  const seeded = isChakraKey(rawSeed) ? rawSeed : undefined;

  const recorder = useVoiceRecorder();
  const [voiceNote, setVoiceNote] = useState<{ uri: string; durationS: number } | null>(null);

  useEffect(() => {
    if (seeded && CHAKRA_BY_KEY[seeded]) {
      setText('');
      inputRef.current?.focus();
    }
  }, [seeded]);

  const toggleRecord = async () => {
    if (recorder.isRecording) {
      const res = await recorder.stop();
      if (res.uri) setVoiceNote({ uri: res.uri, durationS: res.durationS });
    } else {
      setVoiceNote(null);
      await recorder.start();
    }
  };

  const switchMode = (voice: boolean) => {
    setVoiceMode(voice);
    if (!voice && recorder.isRecording) void recorder.stop();
  };

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    void addEntry(body, voiceMode ? 'voice' : 'text', {
      seededChakra: seeded,
      voiceUrl: voiceMode ? (voiceNote?.uri ?? undefined) : undefined,
      voiceDurationS: voiceMode ? voiceNote?.durationS : undefined,
    });
    setText('');
    setVoiceNote(null);
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
                <Pressable onPress={() => switchMode(false)}>
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
                <Pressable onPress={() => switchMode(true)}>
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
              <View className="border-line mt-3 border-t pt-3">
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={toggleRecord}
                    className="h-10 w-10 items-center justify-center rounded-full border"
                    style={{
                      borderColor: recorder.isRecording ? '#ff4d5e' : ACCENT,
                      backgroundColor: recorder.isRecording ? '#ff4d5e22' : `${ACCENT}1a`,
                    }}
                  >
                    {recorder.isRecording ? (
                      <Square color="#ff4d5e" size={14} fill="#ff4d5e" />
                    ) : (
                      <Mic color={ACCENT} size={16} />
                    )}
                  </Pressable>
                  <View className="flex-1">
                    {recorder.isRecording ? (
                      <Mono style={{ color: '#ff4d5e' }}>
                        RECORDING · {fmtClock(recorder.durationMillis)}
                      </Mono>
                    ) : voiceNote ? (
                      <Mono style={{ color: ACCENT }}>
                        VOICE NOTE SAVED · {voiceNote.durationS}s
                      </Mono>
                    ) : (
                      <Mono>TAP TO RECORD · THEN TYPE WHAT YOU SAID</Mono>
                    )}
                    {recorder.denied ? (
                      <Text
                        className="text-faint mt-1 font-mono"
                        style={{ fontSize: 9, letterSpacing: 0.8 }}
                      >
                        MICROPHONE ACCESS DENIED · ENABLE IT IN SETTINGS
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
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
            entries.map((entry, i) => (
              <FadeIn key={entry.id} index={i}>
                <EntryCard entry={entry} />
              </FadeIn>
            ))
          )}
        </View>

        <View className="mt-6 px-4">
          <Text
            className="text-faint text-center font-mono"
            style={{ fontSize: 9, letterSpacing: 0.8 }}
          >
            YOUR JOURNAL SYNCS PRIVATELY · NEVER USED TO TRAIN ANYTHING
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const updateEntry = useChakraStore((s) => s.updateEntry);
  const deleteEntry = useChakraStore((s) => s.deleteEntry);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.body);

  const saveEdit = () => {
    const next = draft.trim();
    if (!next || next === entry.body) {
      setEditing(false);
      setDraft(entry.body);
      return;
    }
    void updateEntry(entry.id, next);
    setEditing(false);
  };

  return (
    <Panel className="p-4">
      <View className="flex-row items-center justify-between">
        <Mono>{format(new Date(entry.createdAt), 'EEE · d MMM').toUpperCase()}</Mono>
        <View className="flex-row items-center gap-2">
          {entry.modality === 'voice' ? (
            <View className="flex-row items-center gap-1">
              <Mic color="#8a90a6" size={9} />
              <Mono>{entry.voiceDurationS ? `${entry.voiceDurationS}s` : 'VOICE'}</Mono>
            </View>
          ) : null}
          <Mono>{format(new Date(entry.createdAt), 'h:mm a').toLowerCase()}</Mono>
          {editing ? (
            <>
              <Pressable hitSlop={8} onPress={saveEdit}>
                <Check color={ACCENT} size={14} />
              </Pressable>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setEditing(false);
                  setDraft(entry.body);
                }}
              >
                <X color="#8a90a6" size={14} />
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setDraft(entry.body);
                  setEditing(true);
                }}
              >
                <Pencil color="#8a90a6" size={13} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => void deleteEntry(entry.id)}>
                <Trash2 color="#ff6b6b" size={13} />
              </Pressable>
            </>
          )}
        </View>
      </View>
      {editing ? (
        <TextInput
          value={draft}
          onChangeText={setDraft}
          multiline
          className="text-ink mt-2"
          style={{
            fontFamily: 'Lora_400Regular_Italic',
            fontSize: 15,
            lineHeight: 22,
            minHeight: 48,
          }}
        />
      ) : (
        <Voice className="mt-2">{`“${entry.body}”`}</Voice>
      )}
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
