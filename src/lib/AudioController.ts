interface AudioConfig {
  url: string;
  volume?: number;
  loop?: boolean;
}

interface SectionAudioMap {
  [key: string]: AudioConfig;
}

export class AudioController {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGainNode: GainNode | null = null;
  private nextGainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private currentSection: string = '';
  private isMuted: boolean = true;
  private masterVolume: number = 0.3;
  private isTransitioning: boolean = false;

  // Section-specific ambient sounds
  private sectionAudio: SectionAudioMap = {
    home: { url: '/audio/home-ambient.mp3', volume: 0.4, loop: true },
    learn: { url: '/audio/learn-ambient.mp3', volume: 0.3, loop: true },
    research: { url: '/audio/research-ambient.mp3', volume: 0.35, loop: true },
    tools: { url: '/audio/tools-ambient.mp3', volume: 0.3, loop: true },
    community: { url: '/audio/community-ambient.mp3', volume: 0.35, loop: true },
    dashboard: { url: '/audio/dashboard-ambient.mp3', volume: 0.25, loop: true },
  };

  constructor() {
    // Initialize on first user interaction
    if (typeof window !== 'undefined') {
      this.isMuted = localStorage.getItem('aeroverse-audio-muted') !== 'false';
      const savedVolume = localStorage.getItem('aeroverse-audio-volume');
      if (savedVolume) {
        this.masterVolume = parseFloat(savedVolume);
      }
    }
  }

  private initAudioContext() {
    if (this.audioContext) return;
    
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.connect(this.audioContext.destination);
  }

  async preloadAudio(section: string): Promise<void> {
    if (!this.sectionAudio[section] || this.audioBuffers.has(section)) return;

    this.initAudioContext();
    if (!this.audioContext) return;

    try {
      const response = await fetch(this.sectionAudio[section].url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(section, audioBuffer);
    } catch (error) {
      console.warn(`Failed to load audio for ${section}:`, error);
    }
  }

  async playSection(section: string, crossfadeDuration: number = 1000): Promise<void> {
    if (this.currentSection === section || this.isTransitioning) return;
    if (!this.sectionAudio[section]) return;

    this.initAudioContext();
    if (!this.audioContext) return;

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.isTransitioning = true;

    // Preload if not already loaded
    if (!this.audioBuffers.has(section)) {
      await this.preloadAudio(section);
    }

    const buffer = this.audioBuffers.get(section);
    if (!buffer) {
      this.isTransitioning = false;
      return;
    }

    // Create new source and gain node
    const newSource = this.audioContext.createBufferSource();
    const newGainNode = this.audioContext.createGain();
    
    newSource.buffer = buffer;
    newSource.loop = this.sectionAudio[section].loop || false;
    
    // Connect: source -> gain -> analyser -> destination
    newSource.connect(newGainNode);
    newGainNode.connect(this.analyser!);

    // Start new audio at 0 volume
    const targetVolume = this.isMuted ? 0 : (this.sectionAudio[section].volume || 0.3) * this.masterVolume;
    newGainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    
    // Fade in new audio
    newGainNode.gain.linearRampToValueAtTime(
      targetVolume,
      this.audioContext.currentTime + crossfadeDuration / 1000
    );

    // Fade out current audio if exists
    if (this.currentSource && this.currentGainNode) {
      const fadeOutGain = this.currentGainNode;
      fadeOutGain.gain.linearRampToValueAtTime(
        0,
        this.audioContext.currentTime + crossfadeDuration / 1000
      );
      
      // Stop old source after fade
      setTimeout(() => {
        this.currentSource?.stop();
      }, crossfadeDuration);
    }

    // Start new source
    newSource.start(0);

    // Update references
    this.currentSource = newSource;
    this.currentGainNode = newGainNode;
    this.currentSection = section;

    setTimeout(() => {
      this.isTransitioning = false;
    }, crossfadeDuration);
  }

  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    
    if (this.currentGainNode && this.audioContext) {
      const targetVolume = this.isMuted 
        ? 0 
        : (this.sectionAudio[this.currentSection]?.volume || 0.3) * this.masterVolume;
      
      this.currentGainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + 0.3
      );
    }

    localStorage.setItem('aeroverse-audio-muted', String(this.isMuted));
    return this.isMuted;
  }

  setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    if (this.currentGainNode && this.audioContext && !this.isMuted) {
      const targetVolume = (this.sectionAudio[this.currentSection]?.volume || 0.3) * this.masterVolume;
      this.currentGainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + 0.1
      );
    }

    localStorage.setItem('aeroverse-audio-volume', String(this.masterVolume));
  }

  getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  getFrequencyBands(): { low: number; mid: number; high: number } {
    const data = this.getAnalyserData();
    if (!data) return { low: 0, mid: 0, high: 0 };

    const bufferLength = data.length;
    const lowEnd = Math.floor(bufferLength * 0.2);
    const midEnd = Math.floor(bufferLength * 0.6);

    let low = 0, mid = 0, high = 0;

    for (let i = 0; i < lowEnd; i++) low += data[i];
    for (let i = lowEnd; i < midEnd; i++) mid += data[i];
    for (let i = midEnd; i < bufferLength; i++) high += data[i];

    return {
      low: low / lowEnd / 255,
      mid: mid / (midEnd - lowEnd) / 255,
      high: high / (bufferLength - midEnd) / 255,
    };
  }

  playUISound(type: 'click' | 'hover' | 'whoosh'): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    switch (type) {
      case 'hover':
        oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.15);
        break;
      case 'whoosh':
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
        break;
    }
  }

  dispose(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.audioBuffers.clear();
  }

  get muted(): boolean {
    return this.isMuted;
  }

  get volume(): number {
    return this.masterVolume;
  }
}

// Singleton instance
let audioControllerInstance: AudioController | null = null;

export const getAudioController = (): AudioController => {
  if (!audioControllerInstance) {
    audioControllerInstance = new AudioController();
  }
  return audioControllerInstance;
};
