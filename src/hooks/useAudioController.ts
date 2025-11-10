import { useEffect, useState, useCallback } from 'react';
import { getAudioController } from '@/lib/AudioController';

export const useAudioController = () => {
  const audioController = getAudioController();
  const [isMuted, setIsMuted] = useState(audioController.muted);
  const [volume, setVolumeState] = useState(audioController.volume);

  const toggleMute = useCallback(() => {
    const newMuted = audioController.toggleMute();
    setIsMuted(newMuted);
  }, [audioController]);

  const setVolume = useCallback((vol: number) => {
    audioController.setVolume(vol);
    setVolumeState(vol);
  }, [audioController]);

  const playSection = useCallback((section: string) => {
    audioController.playSection(section);
  }, [audioController]);

  const playUISound = useCallback((type: 'click' | 'hover' | 'whoosh') => {
    audioController.playUISound(type);
  }, [audioController]);

  return {
    isMuted,
    volume,
    toggleMute,
    setVolume,
    playSection,
    playUISound,
  };
};
