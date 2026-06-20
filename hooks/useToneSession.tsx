import { AudioModule, createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

import { beatHzFromBand, buildToneUri } from '@/lib/tone';

/**
 * Plays a seamlessly-looping synthesized solfeggio + binaural tone for a
 * session. The waveform is generated on-device (no asset files). Playback is
 * driven imperatively so the React tree stays clean; the visualizer reads the
 * same `playing` flag the screen owns.
 */
export function useToneSession(args: { carrierHz: number; band: string; playing: boolean }): void {
  const { carrierHz, band, playing } = args;
  const playerRef = useRef<AudioPlayer | null>(null);
  // Stable ref so the build effect can read the current playing state without
  // depending on it (avoids rebuilding the audio buffer on every play/pause).
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // (re)build the player whenever the tone identity changes
  useEffect(() => {
    let cancelled = false;
    let player: AudioPlayer | null = null;

    void (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        const uri = buildToneUri({ carrierHz, beatHz: beatHzFromBand(band) });
        if (cancelled) return;
        player = createAudioPlayer({ uri });
        player.loop = true;
        playerRef.current = player;
        if (playingRef.current) player.play();
      } catch {
        // synthesis/playback unavailable (e.g. headless) — visualizer still runs
      }
    })();

    return () => {
      cancelled = true;
      try {
        player?.remove();
      } catch {
        // already released
      }
      playerRef.current = null;
    };
  }, [carrierHz, band]);

  // react to play/pause toggles without rebuilding the buffer
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (playing) player.play();
      else player.pause();
    } catch {
      // ignore transient player state errors
    }
  }, [playing]);
}

/** Request microphone access for voice journaling. Returns whether granted. */
export async function requestMicAccess(): Promise<boolean> {
  try {
    const status = await AudioModule.requestRecordingPermissionsAsync();
    return status.granted;
  } catch {
    return false;
  }
}
