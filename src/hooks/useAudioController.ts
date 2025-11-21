import { useCallback, useEffect, useMemo, useState } from "react";
import {
  globalAudioController,
  audioTracks,
  type AudioTrack,
} from "@/lib/audio/globalAudioController";

interface ControllerState {
  isMuted: boolean;
  isPlaying: boolean;
  volume: number;
  track: AudioTrack;
}

const buildInitialState = (): ControllerState => ({
  isMuted: globalAudioController.isMuted(),
  isPlaying: globalAudioController.isPlaying(),
  volume: globalAudioController.getVolume(),
  track: globalAudioController.getCurrentTrack(),
});

export const useAudioController = () => {
  const [state, setState] = useState<ControllerState>(buildInitialState);

  useEffect(() => {
    const audio = globalAudioController.getAudioElement();
    if (!audio) return;

    const handleVolumeChange = () => {
      setState((prev) => ({
        ...prev,
        volume: audio.volume,
        isMuted: audio.muted,
      }));
    };

    const handlePlay = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: true,
        isMuted: audio.muted,
      }));
    };

    const handlePause = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isMuted: audio.muted,
      }));
    };

    const handleEnded = () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    };

    audio.addEventListener("volumechange", handleVolumeChange);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const mute = useCallback(() => {
    globalAudioController.mute();
    setState((prev) => ({ ...prev, isMuted: true, isPlaying: false }));
  }, []);

  const unmute = useCallback(() => {
    globalAudioController.unmute();
    setState((prev) => ({ ...prev, isMuted: false, isPlaying: true }));
  }, []);

  const setVolume = useCallback((value: number) => {
    globalAudioController.setVolume(value);
    setState((prev) => ({ ...prev, volume: value }));
  }, []);

  const setTrack = useCallback((trackId: string) => {
    const track = globalAudioController.setTrack(trackId);
    setState((prev) => ({ ...prev, track, isPlaying: globalAudioController.isPlaying() }));
  }, []);

  const play = useCallback(() => {
    globalAudioController.play();
  }, []);

  const pause = useCallback(() => {
    globalAudioController.pause();
  }, []);

  const tracks = useMemo(() => audioTracks, []);

  return {
    ...state,
    tracks,
    mute,
    unmute,
    setVolume,
    setTrack,
    play,
    pause,
  };
};
