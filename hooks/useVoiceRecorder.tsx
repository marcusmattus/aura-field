import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useState } from 'react';

/**
 * Voice-note recording for the Journal composer. Captures audio to a local
 * file URI on this device (the words are typed by the user — no auto
 * transcription). Returns the URI + length so the entry can keep its recording.
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [denied, setDenied] = useState(false);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setDenied(true);
        return false;
      }
      setDenied(false);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch {
      return false;
    }
  }, [recorder]);

  const stop = useCallback(async (): Promise<{ uri: string | null; durationS: number }> => {
    try {
      const durationS = Math.round((state.durationMillis ?? 0) / 1000);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      return { uri: recorder.uri ?? null, durationS };
    } catch {
      return { uri: null, durationS: 0 };
    }
  }, [recorder, state.durationMillis]);

  return {
    start,
    stop,
    isRecording: state.isRecording,
    durationMillis: state.durationMillis ?? 0,
    denied,
  };
}
