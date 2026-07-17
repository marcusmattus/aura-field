import { AudioModule, createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

import { beatHzFromBand, buildToneUri } from '@/lib/tone';

/**
 * Plays a seamlessly-looping synthesized solfeggio + binaural tone for a
 * session. The waveform is generated on-device (no asset files).
 */
export function useToneSession(args: {
  carrierHz: number;
  band: string;
  playing: boolean;
  beatHz?: number;
}): void {
  const { carrierHz, band, playing, beatHz } = args;
  const playerRef = useRef<AudioPlayer | null>(null);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    let cancelled = false;
    let player: AudioPlayer | null = null;

    void (async () => {
      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        const uri = buildToneUri({
          carrierHz,
          beatHz: beatHz ?? beatHzFromBand(band),
        });
        if (cancelled) return;
        player = createAudioPlayer({ uri });
        player.loop = true;
        playerRef.current = player;
        if (playingRef.current) player.play();
      } catch {
        // synthesis/playback unavailable — visualizer still runs
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
  }, [carrierHz, band, beatHz]);

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
