type AudioTrack = {
  id: string;
  name: string;
  src: string;
};

const AUDIO_STORAGE_KEYS = {
  muted: "aeroverse-audio-muted",
  volume: "aeroverse-audio-volume",
  track: "aeroverse-audio-track",
};

const audioTracks: AudioTrack[] = [
  { id: "home", name: "Home Ambient", src: "/audio/home-ambient.mp3" },
  { id: "learn", name: "Learning Lab", src: "/audio/learn-ambient.mp3" },
  { id: "tools", name: "Tools Bay", src: "/audio/tools-ambient.mp3" },
  { id: "dashboard", name: "Mission Control", src: "/audio/dashboard-ambient.mp3" },
  { id: "community", name: "Community Hub", src: "/audio/community-ambient.mp3" },
  { id: "research", name: "Research Annex", src: "/audio/research-ambient.mp3" },
];

const getDefaultTrack = (): AudioTrack => {
  if (typeof window === "undefined") {
    return audioTracks[0];
  }
  const savedId = window.localStorage.getItem(AUDIO_STORAGE_KEYS.track);
  const match = audioTracks.find((track) => track.id === savedId);
  return match ?? audioTracks[0];
};

class GlobalAudioController {
  private audio: HTMLAudioElement | null = null;
  private currentTrack: AudioTrack = getDefaultTrack();
  private volume = this.loadVolume();

  private createAudioElement(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (this.audio) return this.audio;

    const audio = new Audio();
    audio.autoplay = true;
    audio.loop = true;
    audio.preload = "auto";
    audio.muted = this.loadMuteState();
    audio.volume = this.volume;
    audio.src = this.currentTrack.src;
    audio.setAttribute("playsinline", "true");
    audio.style.display = "none";

    document.body.appendChild(audio);
    // Attempt to start playback (muted to satisfy autoplay policies)
    audio.load();
    audio.play().catch(() => {
      // Autoplay might still be blocked until user interaction.
      // That's fine—the unmute/play controls will retry.
    });

    this.audio = audio;
    return this.audio;
  }

  private loadVolume(): number {
    if (typeof window === "undefined") return 0.5;
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEYS.volume);
    if (!stored) return 0.5;
    const parsed = parseFloat(stored);
    if (Number.isNaN(parsed)) return 0.5;
    return Math.min(1, Math.max(0, parsed));
  }

  private loadMuteState(): boolean {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEYS.muted);
    if (stored === null) return true;
    return stored === "true";
  }

  private persistMuteState(muted: boolean) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUDIO_STORAGE_KEYS.muted, String(muted));
  }

  private persistTrack(trackId: string) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AUDIO_STORAGE_KEYS.track, trackId);
  }

  private clampVolume(value: number): number {
    if (Number.isNaN(value)) return this.volume;
    return Math.min(1, Math.max(0, value));
  }

  getAudioElement(): HTMLAudioElement | null {
    return this.createAudioElement();
  }

  play(): void {
    const audio = this.getAudioElement();
    if (!audio) return;
    audio.play().catch(() => {
      /* playback will retry when user interacts */
    });
  }

  pause(): void {
    this.audio?.pause();
  }

  mute(): void {
    const audio = this.getAudioElement();
    if (!audio) return;
    audio.muted = true;
    audio.pause();
    this.persistMuteState(true);
  }

  unmute(): void {
    const audio = this.getAudioElement();
    if (!audio) return;
    audio.muted = false;
    this.persistMuteState(false);
    this.play();
  }

  setVolume(value: number): void {
    const audio = this.getAudioElement();
    const clamped = this.clampVolume(value);
    this.volume = clamped;

    if (audio) {
      audio.volume = clamped;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(AUDIO_STORAGE_KEYS.volume, String(clamped));
    }
  }

  setTrack(trackIdOrUrl: string): AudioTrack {
    const match =
      audioTracks.find(
        (track) => track.id === trackIdOrUrl || track.src === trackIdOrUrl
      ) ?? {
        id: trackIdOrUrl,
        name: "Custom Track",
        src: trackIdOrUrl,
      };

    this.currentTrack = match;
    this.persistTrack(match.id);

    const audio = this.getAudioElement();
    if (!audio) return this.currentTrack;

    const wasMuted = audio.muted;
    audio.src = match.src;
    audio.load();
    audio.muted = wasMuted;

    audio.play().catch(() => {
      // Ignore play promise rejection; user interaction may be required
    });

    return this.currentTrack;
  }

  getCurrentTrack(): AudioTrack {
    return this.currentTrack;
  }

  getTracks(): AudioTrack[] {
    return audioTracks;
  }

  getVolume(): number {
    const audio = this.getAudioElement();
    if (audio) return audio.volume;
    return this.volume;
  }

  isMuted(): boolean {
    const audio = this.getAudioElement();
    if (audio) return audio.muted;
    return true;
  }

  isPlaying(): boolean {
    const audio = this.audio;
    if (!audio) return false;
    return !audio.paused && !audio.ended;
  }
}

export const globalAudioController = new GlobalAudioController();
export type { AudioTrack };
export { audioTracks };
