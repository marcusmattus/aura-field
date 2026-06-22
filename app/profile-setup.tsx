import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, Check, ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from 'heroui-native';

import { Display, Mono, Panel } from '@/components/ui';
import { CHAKRAS, SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import type { BaselineMood, ChakraKey, ExperienceLevel } from '@/lib/types';

const ACCENT = SURFACE_ACCENT.you;
const INK = '#e9ecf5';

const MOODS: { value: BaselineMood; label: string }[] = [
  { value: 1, label: 'Heavy' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Even' },
  { value: 4, label: 'Light' },
  { value: 5, label: 'Clear' },
];

const EXPERIENCE: { value: ExperienceLevel; label: string; sub: string }[] = [
  { value: 'new', label: 'New to this', sub: 'First time with energy / reflective work' },
  { value: 'some', label: 'Some practice', sub: 'I journal or meditate now and then' },
  { value: 'devoted', label: 'Devoted', sub: 'This is part of my daily rhythm' },
];

const TOTAL_STEPS = 5;
const STEP_KEYS = ['name', 'focus', 'mood', 'experience', 'intention'] as const;

function isoFromParts(y: string, m: string, d: string): string | null {
  const yy = Number(y);
  const mm = Number(m);
  const dd = Number(d);
  if (!yy || !mm || !dd) return null;
  if (yy < 1900 || yy > new Date().getFullYear()) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const date = new Date(yy, mm - 1, dd);
  if (date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  return `${yy.toString().padStart(4, '0')}-${mm.toString().padStart(2, '0')}-${dd
    .toString()
    .padStart(2, '0')}`;
}

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const saveUserProfile = useChakraStore((s) => s.saveUserProfile);
  const existing = useChakraStore((s) => s.profile);
  const isEditing = Boolean(existing?.displayName);

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(existing?.displayName ?? '');
  const [birthdate, setBirthdate] = useState(() => {
    const iso = existing?.birthdate;
    if (!iso) return { y: '', m: '', d: '' };
    const [y, m, d] = iso.split('-');
    return { y: y ?? '', m: m ?? '', d: d ?? '' };
  });
  const [focusAreas, setFocusAreas] = useState<ChakraKey[]>(existing?.focusAreas ?? []);
  const [mood, setMood] = useState<BaselineMood | null>(existing?.baselineMood ?? null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(
    existing?.experienceLevel ?? null,
  );
  const [intention, setIntention] = useState(existing?.primaryIntention ?? '');

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return name.trim().length >= 2;
      case 1:
        return focusAreas.length > 0;
      case 2:
        return mood !== null;
      case 3:
        return experience !== null;
      case 4:
        return intention.trim().length >= 4;
      default:
        return false;
    }
  }, [step, name, focusAreas, mood, experience, intention]);

  const toggleFocus = (key: ChakraKey) => {
    setFocusAreas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key].slice(0, 4),
    );
  };

  const finish = async () => {
    setError(null);
    setBusy(true);
    const saved = await saveUserProfile({
      displayName: name.trim(),
      birthdate: isoFromParts(birthdate.y, birthdate.m, birthdate.d),
      focusAreas,
      baselineMood: mood,
      experienceLevel: experience,
      primaryIntention: intention.trim(),
    });
    setBusy(false);
    if (!saved) {
      setError('Could not save your profile. Check your connection and try again.');
      return;
    }
    // First-time setup (no subscription yet, not yet through paywall) continues
    // into the paywall; an edit from inside the app just returns.
    if (router.canGoBack() && isEditing) {
      router.back();
    } else {
      router.replace('/paywall');
    }
  };

  const next = () => {
    if (!canAdvance) return;
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      setError(null);
    } else {
      void finish();
    }
  };

  const back = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => s - 1);
    setError(null);
  };

  return (
    <View className="bg-field flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar `style` is a string enum */}
      <StatusBar style="light" />

      <View className="pt-safe-offset-3 flex-row items-center justify-between px-5">
        <Pressable hitSlop={12} onPress={back} className="flex-row items-center gap-1">
          <ChevronLeft color="#8a90a6" size={16} />
          <Mono>BACK</Mono>
        </Pressable>
        <Mono>
          STEP {step + 1} / {TOTAL_STEPS}
        </Mono>
      </View>

      <View className="mt-4 flex-row gap-1.5 px-5">
        {STEP_KEYS.map((stepKey, i) => (
          <View
            key={stepKey}
            className="h-1 flex-1 rounded-full"
            style={{ backgroundColor: i <= step ? ACCENT : '#1e2535' }}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? (
            <Step
              eyebrow="ABOUT YOU"
              title="What should we call you?"
              body="This is the name shown on your profile and aura."
            >
              <Mono className="mb-2">DISPLAY NAME</Mono>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#3a4255"
                autoCapitalize="words"
                className="bg-panel border-line rounded-2xl border px-4 py-3.5"
                style={{ fontFamily: 'Inter_400Regular', fontSize: 16, color: INK }}
              />

              <Mono className="mt-5 mb-2">BIRTHDATE · OPTIONAL</Mono>
              <View className="flex-row gap-3">
                <DateBox
                  label="YYYY"
                  value={birthdate.y}
                  maxLength={4}
                  onChangeText={(t) => setBirthdate((b) => ({ ...b, y: t.replace(/\D/g, '') }))}
                />
                <DateBox
                  label="MM"
                  value={birthdate.m}
                  maxLength={2}
                  onChangeText={(t) => setBirthdate((b) => ({ ...b, m: t.replace(/\D/g, '') }))}
                />
                <DateBox
                  label="DD"
                  value={birthdate.d}
                  maxLength={2}
                  onChangeText={(t) => setBirthdate((b) => ({ ...b, d: t.replace(/\D/g, '') }))}
                />
              </View>
            </Step>
          ) : null}

          {step === 1 ? (
            <Step
              eyebrow="FOCUS"
              title="Where do you want to grow?"
              body="Pick up to four nodes. We'll weight your field and coaching toward them."
            >
              <View className="gap-2">
                {CHAKRAS.map((c) => {
                  const on = focusAreas.includes(c.key);
                  return (
                    <Pressable key={c.key} onPress={() => toggleFocus(c.key)}>
                      <Panel
                        className="flex-row items-center gap-3 p-3.5"
                        style={on ? { borderColor: c.color } : undefined}
                      >
                        <View
                          className="h-7 w-7 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <View className="flex-1">
                          <Text
                            className="text-ink"
                            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15 }}
                          >
                            {c.name}
                          </Text>
                          <Text className="text-faint font-mono" style={{ fontSize: 10 }}>
                            {c.attributes.join(' · ').toUpperCase()}
                          </Text>
                        </View>
                        <View
                          className="h-6 w-6 items-center justify-center rounded-full border"
                          style={{
                            borderColor: on ? c.color : '#2a3144',
                            backgroundColor: on ? c.color : 'transparent',
                          }}
                        >
                          {on ? <Check color="#0a0e18" size={14} /> : null}
                        </View>
                      </Panel>
                    </Pressable>
                  );
                })}
              </View>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step
              eyebrow="BASELINE"
              title="How do you feel lately?"
              body="A rough baseline so we can read your trend over time."
            >
              <View className="gap-2">
                {MOODS.map((m) => {
                  const on = mood === m.value;
                  return (
                    <Pressable key={m.value} onPress={() => setMood(m.value)}>
                      <Panel
                        className="flex-row items-center justify-between p-4"
                        style={on ? { borderColor: ACCENT } : undefined}
                      >
                        <Text
                          className="text-ink"
                          style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16 }}
                        >
                          {m.label}
                        </Text>
                        <View className="flex-row gap-1">
                          {MOODS.map((dot) => (
                            <View
                              key={dot.value}
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: dot.value <= m.value ? ACCENT : '#2a3144',
                                opacity: on ? 1 : 0.5,
                              }}
                            />
                          ))}
                        </View>
                      </Panel>
                    </Pressable>
                  );
                })}
              </View>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step
              eyebrow="EXPERIENCE"
              title="Where are you on the path?"
              body="This tunes how the coach speaks to you."
            >
              <View className="gap-2">
                {EXPERIENCE.map((e) => {
                  const on = experience === e.value;
                  return (
                    <Pressable key={e.value} onPress={() => setExperience(e.value)}>
                      <Panel className="p-4" style={on ? { borderColor: ACCENT } : undefined}>
                        <View className="flex-row items-center justify-between">
                          <Text
                            className="text-ink"
                            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16 }}
                          >
                            {e.label}
                          </Text>
                          <View
                            className="h-5 w-5 items-center justify-center rounded-full border"
                            style={{
                              borderColor: on ? ACCENT : '#2a3144',
                              backgroundColor: on ? ACCENT : 'transparent',
                            }}
                          >
                            {on ? <Check color="#0a0e18" size={12} /> : null}
                          </View>
                        </View>
                        <Text className="text-mute mt-1" style={{ fontSize: 13 }}>
                          {e.sub}
                        </Text>
                      </Panel>
                    </Pressable>
                  );
                })}
              </View>
            </Step>
          ) : null}

          {step === 4 ? (
            <Step
              eyebrow="INTENTION"
              title="Set your 30-day intention"
              body="One line you want to move toward. The field tracks it for you."
            >
              <TextInput
                value={intention}
                onChangeText={setIntention}
                placeholder="e.g. Speak my truth before resentment builds."
                placeholderTextColor="#3a4255"
                multiline
                className="bg-panel border-line rounded-2xl border px-4 py-3.5"
                style={{
                  fontFamily: 'Lora_400Regular_Italic',
                  fontSize: 16,
                  lineHeight: 24,
                  color: INK,
                  minHeight: 110,
                  textAlignVertical: 'top',
                }}
              />
            </Step>
          ) : null}

          {error ? (
            <Text
              className="mt-4"
              style={{ color: '#ff6b6b', fontSize: 13, fontFamily: 'Inter_400Regular' }}
            >
              {error}
            </Text>
          ) : null}
        </ScrollView>

        <View className="pb-safe-offset-5 px-6 pt-2" style={{ width }}>
          <Pressable
            disabled={!canAdvance || busy}
            className="flex-row items-center justify-center gap-2 rounded-full py-4"
            style={{ backgroundColor: ACCENT, opacity: !canAdvance || busy ? 0.4 : 1 }}
            onPress={next}
          >
            {busy ? (
              <ActivityIndicator color="#0a0e18" size="small" />
            ) : (
              <>
                <Text className="font-mono-bold" style={{ fontSize: 13, color: '#0a0e18' }}>
                  {step === TOTAL_STEPS - 1 ? 'COMPLETE PROFILE' : 'CONTINUE'}
                </Text>
                <ArrowRight color="#0a0e18" size={16} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Step({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Mono style={{ color: ACCENT }}>{eyebrow}</Mono>
      <Display size={28} className="mt-2">
        {title}
      </Display>
      <Text className="text-mute mt-3 mb-6" style={{ fontSize: 15, lineHeight: 23 }}>
        {body}
      </Text>
      {children}
    </View>
  );
}

function DateBox({ label, ...rest }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="flex-1">
      <TextInput
        placeholder={label}
        placeholderTextColor="#3a4255"
        keyboardType="number-pad"
        className="bg-panel border-line rounded-2xl border px-4 py-3.5 text-center"
        style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 15, color: INK }}
        {...rest}
      />
    </View>
  );
}
