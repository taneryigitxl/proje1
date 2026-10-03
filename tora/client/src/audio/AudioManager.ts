export type AudioChannel = "music" | "environment" | "ui" | "combat" | "skill" | "monster" | "gathering";

const STORAGE_KEY = "tora.audio";

const DEFAULT_VOLUMES: Record<AudioChannel, number> = {
  music: 0.55,
  environment: 0.7,
  ui: 0.8,
  combat: 0.8,
  skill: 0.8,
  monster: 0.75,
  gathering: 0.7,
};

interface AudioPreferences {
  muted: boolean;
  volumes: Record<AudioChannel, number>;
}

export class AudioManager {
  private preferences: AudioPreferences = {
    muted: false,
    volumes: { ...DEFAULT_VOLUMES },
  };

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Partial<AudioPreferences>;
      if (typeof parsed.muted === "boolean") this.preferences.muted = parsed.muted;
      if (parsed.volumes) {
        for (const channel of Object.keys(DEFAULT_VOLUMES) as AudioChannel[]) {
          const value = parsed.volumes[channel];
          if (typeof value === "number") this.preferences.volumes[channel] = clamp(value);
        }
      }
    } catch {
      this.preferences = { muted: false, volumes: { ...DEFAULT_VOLUMES } };
    }
  }

  volume(channel: AudioChannel): number {
    return this.preferences.muted ? 0 : this.preferences.volumes[channel];
  }

  setVolume(channel: AudioChannel, value: number): void {
    this.preferences.volumes[channel] = clamp(value);
    this.persist();
  }

  get muted(): boolean {
    return this.preferences.muted;
  }

  setMuted(muted: boolean): void {
    this.preferences.muted = muted;
    this.persist();
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
  }
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export const audio = new AudioManager();
