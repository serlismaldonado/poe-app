import { Config } from "./settings";

export class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    try {
      const AudioContextClass =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    } catch {}
  }

  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(type: "key" | "backspace" | "enter", cfg: Config): void {
    if (!this.enabled || !cfg.sound || !this.audioContext) return;

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const volume = (cfg.soundVolume || 60) / 100;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      switch (type) {
        case "key":
          osc.frequency.setValueAtTime(200 + Math.random() * 100, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
          gain.gain.setValueAtTime(volume * 0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
          break;

        case "backspace":
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
          gain.gain.setValueAtTime(volume * 0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
          break;

        case "enter":
          osc.frequency.setValueAtTime(250, now);
          osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
          gain.gain.setValueAtTime(volume * 0.25, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
      }
    } catch {}
  }
}
