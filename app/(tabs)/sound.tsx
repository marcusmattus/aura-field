/**
 * FREQUENCY CANVAS — The heart of chakraOS
 * 
 * Replaces traditional sound screen with a real-time frequency interface.
 * Everything is procedurally generated from the Frequency Engine:
 * - Central orb responds to live audio
 * - Colors derive from baseHz
 * - Animations sync with brainwave patterns
 * - Timeline shows session progression
 * - AI generates optimal frequencies in real-time
 */

import { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Play, Pause, RotateCcw, Settings, Volume2, Zap, Heart, Brain } from 'lucide-react-native';
import { Text as UIText } from 'heroui-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  interpolate,
  useDerivedValue,
  withSpring
} from 'react-native-reanimated';

import { FrequencyVisualizer } from '@/components/FrequencyVisualizer';
import { useFrequencyAudio } from '@/lib/audio-engine';
import { FrequencyEngine, createDefaultFieldState, generateFieldState, type FieldState } from '@/lib/frequency';
import { findBestRecipe, executeRecipe, getAllRecipes, type Intent } from '@/lib/recipes';
import { useChakraStore } from '@/lib/store';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Mono, Panel, Display, LockOverlay } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const ACCENT = SURFACE_ACCENT.sound;

// Intent buttons for quick session generation
const INTENT_OPTIONS: { intent: Intent; icon: any; label: string; color: string }[] = [
  { intent: 'clarity', icon: Brain, label: 'Clear Mind', color: '#741FF4' },
  { intent: 'energy', icon: Zap, label: 'Energize', color: '#FFD23D' },
  { intent: 'heart-coherence', icon: Heart, label: 'Heart Flow', color: '#36F5A6' },
  { intent: 'grounding', icon: RotateCcw, label: 'Ground', color: '#FF4D5E' },
  { intent: 'stress-relief', icon: Volume2, label: 'Release', color: '#3DB6FF' },
];

export default function FrequencyCanvas() {
  const subscribed = useChakraStore((s) => s.subscribed);
  const chakraStates = useChakraStore((s) => s.states);
  const recentEntries = useChakraStore((s) => s.entries.slice(0, 3));
  
  // Audio management
  const { start: startAudio, stop: stopAudio, update: updateAudio, isPlaying, analyser, error } = useFrequencyAudio();
  
  // Session state
  const [currentFieldState, setCurrentFieldState] = useState<FieldState>(() => 
    generateFieldState(chakraStates, recentEntries[0] ? 0 : undefined)
  );
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<Intent>('clarity');
  
  // Derive everything from current field state
  const engineOutput = useMemo(() => FrequencyEngine(currentFieldState), [currentFieldState]);
  
  // Session timing
  const sessionProgress = useSharedValue(0);
  const elapsedSeconds = useSharedValue(0);
  
  // Update session progress
  useEffect(() => {
    if (!isPlaying || !sessionStartTime) {
      return;
    }
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - sessionStartTime) / 1000;
      elapsedSeconds.value = elapsed;
      sessionProgress.value = Math.min(1, elapsed / currentFieldState.duration);
      
      // Auto-stop when session completes
      if (elapsed >= currentFieldState.duration) {
        handleStop();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, sessionStartTime, currentFieldState.duration]);
  
  // Handle session start
  const handleStart = async () => {
    if (isPlaying) {
      await handleStop();
      return;
    }
    
    try {
      await startAudio(engineOutput.audio, currentFieldState.duration);
      setSessionStartTime(Date.now());
    } catch (err) {
      console.error('Failed to start session:', err);
      Alert.alert('Audio Error', 'Could not start frequency synthesis. Please check your audio settings.');
    }
  };
  
  // Handle session stop
  const handleStop = async () => {
    try {
      await stopAudio();
      setSessionStartTime(null);
      sessionProgress.value = withSpring(0);
      elapsedSeconds.value = 0;
      
      // If session was completed, update XP and record
      if (sessionProgress.value > 0.8) {
        // TODO: Implement XP tracking and session completion
      }
    } catch (err) {
      console.error('Failed to stop session:', err);
    }
  };
  
  // Generate new session from intent
  const generateFromIntent = (intent: Intent) => {
    setSelectedIntent(intent);
    
    const context = {
      chakraStates,
      recentMood: recentEntries[0] ? 0 : undefined, // TODO: Extract mood from recent entries
      timeOfDay: new Date().getHours(),
      stressLevel: Math.max(0, 100 - (chakraStates.reduce((sum, s) => sum + s.energy, 0) / chakraStates.length)),
      energyLevel: chakraStates.reduce((sum, s) => sum + s.energy, 0) / chakraStates.length,
      availableTime: 600 // Default 10 minutes
    };
    
    const recipe = findBestRecipe(context, intent);
    const newFieldState = recipe.generate(context);
    setCurrentFieldState(newFieldState);
    
    // Update audio if currently playing
    if (isPlaying) {
      const newOutput = FrequencyEngine(newFieldState);
      updateAudio(newOutput.audio);
    }
  };
  
  // Animated styles for progress
  const progressStyle = useAnimatedStyle(() => ({
    width: `${sessionProgress.value * 100}%`,
  }));
  
  const timeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isPlaying ? 1 : 0.6),
  }));
  
  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0e18' }}>
      {!subscribed && (
        <LockOverlay
          surface="FREQUENCY · FULL ACCESS"
          accent={ACCENT}
          title="Unlock the Frequency Engine"
          body="Experience real-time procedural frequency synthesis with binaural beats, AI coaching, and adaptive visualizations."
        />
      )}
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: 60, paddingHorizontal: 16 }}>
          <Mono style={{ color: engineOutput.colors.primary, marginTop: 12 }}>
            FREQUENCY CANVAS
          </Mono>
          <Display size={26} style={{ marginTop: 4, color: '#ffffff' }}>
            {engineOutput.session.name}
          </Display>
          <Text style={{ 
            fontFamily: 'JetBrainsMono_400Regular', 
            fontSize: 11, 
            color: '#666',
            marginTop: 4 
          }}>
            {engineOutput.session.baseHz} Hz · {engineOutput.session.intent} · {Math.round(currentFieldState.duration / 60)} min
          </Text>
        </View>

        {/* Central Visualizer */}
        <View style={{ 
          alignItems: 'center', 
          paddingVertical: 40,
          paddingHorizontal: 16 
        }}>
          <View style={{
            width: Math.min(screenWidth - 80, 320),
            height: Math.min(screenWidth - 80, 320),
            position: 'relative'
          }}>
            {/* Background gradient */}
            <LinearGradient
              colors={[engineOutput.colors.background, 'transparent']}
              style={{
                position: 'absolute',
                top: -40,
                left: -40,
                right: -40,
                bottom: -40,
                borderRadius: 200,
              }}
            />
            
            {/* Main visualizer */}
            <FrequencyVisualizer
              size={Math.min(screenWidth - 80, 320)}
              colors={engineOutput.colors}
              visualization={engineOutput.visualization}
              analyser={analyser}
              playing={isPlaying}
              currentFrequency={currentFieldState.baseHz}
            />
            
            {/* Play/Pause overlay */}
            <View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'box-none'
            }}>
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => ({
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: pressed ? engineOutput.colors.accent : engineOutput.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {isPlaying ? (
                  <Pause size={32} color="#0a0e18" fill="#0a0e18" />
                ) : (
                  <Play size={32} color="#0a0e18" fill="#0a0e18" />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Session Timeline */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <View style={{
            height: 4,
            backgroundColor: '#1a1f2e',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <Animated.View
              style={[
                progressStyle,
                {
                  height: '100%',
                  backgroundColor: engineOutput.colors.primary,
                  borderRadius: 2,
                }
              ]}
            />
          </View>
          
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 8
          }}>
            <Animated.Text style={[
              timeStyle,
              {
                fontFamily: 'JetBrainsMono_400Regular',
                fontSize: 12,
                color: engineOutput.colors.primary
              }
            ]}>
              {formatTime(elapsedSeconds.value)}
            </Animated.Text>
            <Text style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 12,
              color: '#666'
            }}>
              {formatTime(currentFieldState.duration)}
            </Text>
          </View>
        </View>

        {/* Frequency Info */}
        <Panel style={{ marginHorizontal: 16, padding: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Mono style={{ fontSize: 10, color: '#666' }}>CARRIER</Mono>
              <UIText style={{ 
                fontFamily: 'JetBrainsMono_600SemiBold', 
                fontSize: 18,
                color: engineOutput.colors.primary 
              }}>
                {currentFieldState.baseHz} Hz
              </UIText>
            </View>
            
            {currentFieldState.beatHz && (
              <View>
                <Mono style={{ fontSize: 10, color: '#666' }}>BINAURAL</Mono>
                <UIText style={{ 
                  fontFamily: 'JetBrainsMono_600SemiBold', 
                  fontSize: 18,
                  color: engineOutput.colors.accent 
                }}>
                  {currentFieldState.beatHz} Hz
                </UIText>
              </View>
            )}
            
            <View>
              <Mono style={{ fontSize: 10, color: '#666' }}>CHAKRA</Mono>
              <UIText style={{ 
                fontFamily: 'Inter_500Medium', 
                fontSize: 14,
                color: '#ffffff',
                textTransform: 'capitalize'
              }}>
                {engineOutput.session.chakra}
              </UIText>
            </View>
          </View>
          
          {engineOutput.brainwave && (
            <View style={{ marginTop: 12 }}>
              <Mono style={{ fontSize: 10, color: '#666' }}>BRAINWAVE TARGET</Mono>
              <UIText style={{ 
                fontFamily: 'Inter_400Regular', 
                fontSize: 12,
                color: '#aaa',
                textTransform: 'capitalize'
              }}>
                {engineOutput.brainwave.band} · {engineOutput.brainwave.intent}
              </UIText>
            </View>
          )}
        </Panel>

        {/* Intent Selection */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <Mono style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
            FREQUENCY INTENTIONS
          </Mono>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {INTENT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedIntent === option.intent;
              
              return (
                <Pressable
                  key={option.intent}
                  onPress={() => generateFromIntent(option.intent)}
                  style={({ pressed }) => ({
                    backgroundColor: isSelected ? option.color : '#1a1f2e',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 20,
                    marginRight: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Icon 
                    size={16} 
                    color={isSelected ? '#0a0e18' : option.color} 
                  />
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: 12,
                    color: isSelected ? '#0a0e18' : '#ffffff',
                    marginLeft: 8
                  }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* AI Coaching Recommendation */}
        {engineOutput.coaching.reasoning && (
          <Panel style={{ marginHorizontal: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Brain size={16} color={engineOutput.colors.accent} />
              <Mono style={{ marginLeft: 8, fontSize: 10, color: engineOutput.colors.accent }}>
                AI FREQUENCY COACH
              </Mono>
            </View>
            <UIText style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 13,
              color: '#ccc',
              lineHeight: 18
            }}>
              {engineOutput.coaching.reasoning}
            </UIText>
          </Panel>
        )}

        {/* Error display */}
        {error && (
          <Panel style={{ 
            marginHorizontal: 16, 
            padding: 16, 
            backgroundColor: '#2d1b1b',
            borderColor: '#ff4d5e',
            borderWidth: 1 
          }}>
            <UIText style={{
              fontFamily: 'Inter_400Regular',
              fontSize: 12,
              color: '#ff8a8a'
            }}>
              Audio Error: {error}
            </UIText>
          </Panel>
        )}
      </ScrollView>
    </View>
  );
}
