import { Config } from "./settings";

type SoundType = "key" | "space" | "enter" | "backspace";

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.6;
  private keyIdx: number = 0;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private soundsLoaded: boolean = false;

  constructor() {
    this.initContext();
  }

  private initContext(): void {
    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch {}
  }

  async loadSounds(): Promise<void> {
    if (!this.audioContext || this.soundsLoaded) return;

    const soundFiles = [
      "key0.mp3",
      "key1.mp3",
      "key2.mp3",
      "key3.mp3",
      "key4.mp3",
      "space.mp3",
      "enter.mp3",
      "backspace.mp3",
    ];

    for (const file of soundFiles) {
      try {
        const response = await fetch(`/sounds/${file}`);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(file, audioBuffer);
        }
      } catch {}
    }

    this.soundsLoaded = true;
  }

  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume / 100));
  }

  play(type: SoundType, cfg: Config): void {
    if (!this.enabled || !cfg.sound) return;
    this.volume = (cfg.soundVolume || 60) / 100;

    if (this.audioBuffers.size > 0) {
      this.playSample(type);
    } else {
      this.playSynth(type);
    }
  }

  private playSample(type: SoundType): void {
    if (!this.audioContext) return;

    let fileName: string;

    switch (type) {
      case "space":
        fileName = "space.mp3";
        break;
      case "enter":
        fileName = "enter.mp3";
        break;
      case "backspace":
        fileName = "backspace.mp3";
        break;
      default:
        fileName = `key${this.keyIdx % 5}.mp3`;
        this.keyIdx++;
        break;
    }

    const buffer = this.audioBuffers.get(fileName);
    if (!buffer) {
      this.playSynth(type);
      return;
    }

    try {
      const source = this.audioContext.createBufferSource();
      const gain = this.audioContext.createGain();

      source.buffer = buffer;
      source.connect(gain);
      gain.connect(this.audioContext.destination);
      gain.gain.value = this.volume;

      source.start(0);
    } catch {}
  }

  private playSynth(type: SoundType): void {
    if (!this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case "key":
        case "space":
          osc.frequency.setValueAtTime(200 + Math.random() * 100, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
          gain.gain.setValueAtTime(this.volume * 0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case "backspace":
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
          gain.gain.setValueAtTime(this.volume * 0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;

        case "enter":
          osc.frequency.setValueAtTime(250, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gain.gain.setValueAtTime(this.volume * 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
      }
    } catch {}
  }
}
