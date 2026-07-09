/**
 * AUDIO ENGINE — Real-time Frequency Synthesis
 * 
 * Generates all audio procedurally using react-native-audio-api:
 * - Binaural beats (left/right ear frequency offsets)
 * - Pure sine waves for chakra frequencies
 * - Brown/pink noise layers
 * - Real-time analysis for visualizer feedback
 * - Smooth fade in/out
 * - Stereo panning effects
 * 
 * PRINCIPLE: Never depend on prerecorded audio. Everything is synthesized
 * in real-time from frequency parameters.
 */

import { AudioContext, OscillatorNode, GainNode, AnalyserNode, NoiseNode, StereoPannerNode } from 'react-native-audio-api';
import type { AudioParameters } from './frequency';

// ─────────────────────────────────────────────────────────────────────────
// Audio Engine Types
// ─────────────────────────────────────────────────────────────────────────

export interface SynthEngine {
  /** Start audio synthesis */
  start(): Promise<void>;
  
  /** Stop audio synthesis */
  stop(): Promise<void>;
  
  /** Update frequency parameters in real-time */
  updateFrequencies(leftHz: number, rightHz: number): void;
  
  /** Update volume (0-1) */
  updateVolume(volume: number): void;
  
  /** Update noise parameters */
  updateNoise(type: 'pink' | 'brown' | null, amplitude: number): void;
  
  /** Get analyser for visualization */
  getAnalyser(): AnalyserNode;
  
  /** Check if currently playing */
  isPlaying(): boolean;
  
  /** Clean up resources */
  dispose(): void;
}

export interface AudioEngineConfig {
  /** Sample rate (default: 44100) */
  sampleRate?: number;
  
  /** Buffer size for low latency (default: 256) */
  bufferSize?: number;
  
  /** Enable spatial audio effects */
  enableSpatial?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Main Synthesis Engine
// ─────────────────────────────────────────────────────────────────────────

export class FrequencySynthEngine implements SynthEngine {
  private audioContext: AudioContext | null = null;
  private leftOscillator: OscillatorNode | null = null;
  private rightOscillator: OscillatorNode | null = null;
  private noiseNode: NoiseNode | null = null;
  private masterGain: GainNode | null = null;
  private leftGain: GainNode | null = null;
  private rightGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private leftPanner: StereoPannerNode | null = null;
  private rightPanner: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isActive = false;

  constructor(private config: AudioEngineConfig = {}) {}

  async start(): Promise<void> {
    if (this.isActive) return;

    try {
      // Initialize audio context
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate ?? 44100,
        latencyHint: 'interactive'
      });

      // Create master gain for volume control
      this.masterGain = new GainNode(this.audioContext, { gain: 0 });
      
      // Create analyser for visualization feedback
      this.analyser = new AnalyserNode(this.audioContext, {
        fftSize: 2048,
        smoothingTimeConstant: 0.85
      });

      // Connect analyser to destination
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Create left and right oscillators for binaural beats
      await this.setupOscillators();
      
      // Create noise generator
      await this.setupNoise();

      this.isActive = true;
    } catch (error) {
      console.error('Failed to start audio engine:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isActive || !this.audioContext) return;

    try {
      // Fade out before stopping
      if (this.masterGain) {
        this.masterGain.gain.exponentialRampToValueAtTime(
          0.001,
          this.audioContext.currentTime + 0.3
        );
      }

      // Stop oscillators after fade
      setTimeout(() => {
        this.leftOscillator?.stop();
        this.rightOscillator?.stop();
        this.noiseNode?.stop();
        this.cleanup();
      }, 350);

    } catch (error) {
      console.error('Error stopping audio engine:', error);
      this.cleanup();
    }
  }

  updateFrequencies(leftHz: number, rightHz: number): void {
    if (!this.isActive || !this.audioContext) return;

    try {
      const now = this.audioContext.currentTime;
      const rampTime = 0.1; // Smooth frequency transitions

      if (this.leftOscillator) {
        this.leftOscillator.frequency.exponentialRampToValueAtTime(
          leftHz,
          now + rampTime
        );
      }

      if (this.rightOscillator) {
        this.rightOscillator.frequency.exponentialRampToValueAtTime(
          rightHz,
          now + rampTime
        );
      }
    } catch (error) {
      console.error('Error updating frequencies:', error);
    }
  }

  updateVolume(volume: number): void {
    if (!this.masterGain || !this.audioContext) return;

    try {
      const clampedVolume = Math.max(0.001, Math.min(1, volume));
      this.masterGain.gain.exponentialRampToValueAtTime(
        clampedVolume,
        this.audioContext.currentTime + 0.1
      );
    } catch (error) {
      console.error('Error updating volume:', error);
    }
  }

  updateNoise(type: 'pink' | 'brown' | null, amplitude: number): void {
    if (!this.noiseGain || !this.audioContext) return;

    try {
      const targetGain = type ? Math.max(0.001, amplitude) : 0.001;
      this.noiseGain.gain.exponentialRampToValueAtTime(
        targetGain,
        this.audioContext.currentTime + 0.2
      );

      // Note: react-native-audio-api may not support different noise types
      // This would need to be implemented with custom noise generation
    } catch (error) {
      console.error('Error updating noise:', error);
    }
  }

  getAnalyser(): AnalyserNode {
    if (!this.analyser) {
      throw new Error('Audio engine not initialized');
    }
    return this.analyser;
  }

  isPlaying(): boolean {
    return this.isActive;
  }

  dispose(): void {
    this.stop();
    this.cleanup();
  }

  private async setupOscillators(): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    // Left ear oscillator
    this.leftOscillator = new OscillatorNode(this.audioContext, {
      type: 'sine',
      frequency: 440
    });
    
    this.leftGain = new GainNode(this.audioContext, { gain: 0.3 });
    this.leftPanner = new StereoPannerNode(this.audioContext, { pan: -1 }); // Full left

    this.leftOscillator.connect(this.leftGain);
    this.leftGain.connect(this.leftPanner);
    this.leftPanner.connect(this.masterGain);

    // Right ear oscillator  
    this.rightOscillator = new OscillatorNode(this.audioContext, {
      type: 'sine',
      frequency: 440
    });

    this.rightGain = new GainNode(this.audioContext, { gain: 0.3 });
    this.rightPanner = new StereoPannerNode(this.audioContext, { pan: 1 }); // Full right

    this.rightOscillator.connect(this.rightGain);
    this.rightGain.connect(this.rightPanner);
    this.rightPanner.connect(this.masterGain);

    // Start oscillators
    this.leftOscillator.start();
    this.rightOscillator.start();
  }

  private async setupNoise(): Promise<void> {
    if (!this.audioContext || !this.masterGain) return;

    try {
      // Note: react-native-audio-api may not have NoiseNode
      // This is a placeholder for when it's available
      this.noiseGain = new GainNode(this.audioContext, { gain: 0 });
      this.noiseGain.connect(this.masterGain);

      // Would create noise node here when available
      // this.noiseNode = new NoiseNode(this.audioContext, { type: 'brown' });
      // this.noiseNode.connect(this.noiseGain);
      // this.noiseNode.start();
    } catch (error) {
      console.warn('Noise generation not available:', error);
    }
  }

  private cleanup(): void {
    this.leftOscillator = null;
    this.rightOscillator = null;
    this.noiseNode = null;
    this.masterGain = null;
    this.leftGain = null;
    this.rightGain = null;
    this.noiseGain = null;
    this.leftPanner = null;
    this.rightPanner = null;
    this.analyser = null;
    this.audioContext = null;
    this.isActive = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Audio Session Manager
// ─────────────────────────────────────────────────────────────────────────

export interface AudioSession {
  engine: SynthEngine;
  startTime: number;
  duration: number;
  fadeInDuration: number;
  fadeOutDuration: number;
}

export class AudioSessionManager {
  private currentSession: AudioSession | null = null;
  private fadeTimer: NodeJS.Timeout | null = null;

  async startSession(params: AudioParameters, duration: number): Promise<AudioSession> {
    // Stop any existing session
    if (this.currentSession) {
      await this.stopSession();
    }

    // Create new synthesis engine
    const engine = new FrequencySynthEngine();
    
    try {
      await engine.start();
      
      // Set initial parameters
      engine.updateFrequencies(params.leftHz, params.rightHz);
      engine.updateNoise(params.noise.type, params.noise.amplitude);
      
      // Fade in
      engine.updateVolume(0.001);
      setTimeout(() => {
        engine.updateVolume(params.volume);
      }, 100);

      const session: AudioSession = {
        engine,
        startTime: Date.now(),
        duration: duration * 1000, // Convert to milliseconds
        fadeInDuration: params.fadeDuration * 1000,
        fadeOutDuration: params.fadeDuration * 1000
      };

      this.currentSession = session;

      // Schedule fade out before session ends
      this.fadeTimer = setTimeout(() => {
        this.fadeOutAndStop();
      }, session.duration - session.fadeOutDuration);

      return session;
    } catch (error) {
      engine.dispose();
      throw error;
    }
  }

  async stopSession(): Promise<void> {
    if (!this.currentSession) return;

    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }

    await this.currentSession.engine.stop();
    this.currentSession = null;
  }

  updateSessionParameters(params: Partial<AudioParameters>): void {
    if (!this.currentSession) return;

    const { engine } = this.currentSession;

    if (params.leftHz !== undefined && params.rightHz !== undefined) {
      engine.updateFrequencies(params.leftHz, params.rightHz);
    }

    if (params.volume !== undefined) {
      engine.updateVolume(params.volume);
    }

    if (params.noise !== undefined) {
      engine.updateNoise(params.noise.type, params.noise.amplitude);
    }
  }

  getCurrentSession(): AudioSession | null {
    return this.currentSession;
  }

  getAnalyser(): AnalyserNode | null {
    return this.currentSession?.engine.getAnalyser() ?? null;
  }

  private async fadeOutAndStop(): Promise<void> {
    if (!this.currentSession) return;

    // Fade out
    this.currentSession.engine.updateVolume(0.001);
    
    // Stop after fade
    setTimeout(async () => {
      await this.stopSession();
    }, this.currentSession.fadeOutDuration);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Singleton Audio Manager
// ─────────────────────────────────────────────────────────────────────────

let globalAudioManager: AudioSessionManager | null = null;

export function getAudioManager(): AudioSessionManager {
  if (!globalAudioManager) {
    globalAudioManager = new AudioSessionManager();
  }
  return globalAudioManager;
}

// ─────────────────────────────────────────────────────────────────────────
// React Hook for Audio Integration
// ─────────────────────────────────────────────────────────────────────────

export interface UseFrequencyAudioResult {
  start: (params: AudioParameters, duration: number) => Promise<void>;
  stop: () => Promise<void>;
  update: (params: Partial<AudioParameters>) => void;
  isPlaying: boolean;
  analyser: AnalyserNode | null;
  error: string | null;
}

import { useState, useEffect, useCallback } from 'react';

export function useFrequencyAudio(): UseFrequencyAudioResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manager] = useState(() => getAudioManager());

  const start = useCallback(async (params: AudioParameters, duration: number) => {
    try {
      setError(null);
      const session = await manager.startSession(params, duration);
      setIsPlaying(true);
      setAnalyser(session.engine.getAnalyser());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio start failed');
      console.error('Audio start error:', err);
    }
  }, [manager]);

  const stop = useCallback(async () => {
    try {
      await manager.stopSession();
      setIsPlaying(false);
      setAnalyser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio stop failed');
      console.error('Audio stop error:', err);
    }
  }, [manager]);

  const update = useCallback((params: Partial<AudioParameters>) => {
    try {
      manager.updateSessionParameters(params);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audio update failed');
      console.error('Audio update error:', err);
    }
  }, [manager]);

  // Monitor session state
  useEffect(() => {
    const checkSession = () => {
      const session = manager.getCurrentSession();
      const playing = session?.engine.isPlaying() ?? false;
      
      if (playing !== isPlaying) {
        setIsPlaying(playing);
      }
      
      if (!playing && analyser) {
        setAnalyser(null);
      }
    };

    const interval = setInterval(checkSession, 1000);
    return () => clearInterval(interval);
  }, [manager, isPlaying, analyser]);

  return { start, stop, update, isPlaying, analyser, error };
}