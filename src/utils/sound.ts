// Preloaded Web Audio API wooden percussion buffers & vibration manager

class MrahaSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private vibrationEnabled: boolean = true;
  private ambientEnabled: boolean = false;
  private ambientTimer: number | null = null;

  private preloaded = false;
  private preloading = false;
  private pickupBuffer: AudioBuffer | null = null;
  private dropBuffers: AudioBuffer[] = [];
  private captureBuffer: AudioBuffer | null = null;
  private victoryBuffer: AudioBuffer | null = null;

  constructor() {
    try {
      this.muted = localStorage.getItem('mraha_muted') === '1';
      this.vibrationEnabled = localStorage.getItem('mraha_vibration') !== '0';
      this.ambientEnabled = localStorage.getItem('mraha_ambient') === '1';
    } catch {
      this.muted = false;
      this.vibrationEnabled = true;
      this.ambientEnabled = false;
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (this.muted || typeof window === 'undefined') return null;
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (this.ctx && !this.preloaded && !this.preloading) {
        void this.preloadBuffers(this.ctx.sampleRate || 44100);
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private async renderOffline(
    sampleRate: number,
    durationSec: number,
    build: (offCtx: OfflineAudioContext) => void
  ): Promise<AudioBuffer | null> {
    try {
      const OfflineCtx =
        window.OfflineAudioContext ||
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .webkitOfflineAudioContext;
      if (!OfflineCtx) return null;
      const offCtx = new OfflineCtx(1, Math.ceil(sampleRate * durationSec), sampleRate);
      build(offCtx);
      return await offCtx.startRendering();
    } catch {
      return null;
    }
  }

  private async preloadBuffers(sampleRate: number): Promise<void> {
    if (this.preloaded || this.preloading) return;
    this.preloading = true;
    try {
      const pickupPromise = this.renderOffline(sampleRate, 0.065, (off) => {
        const osc = off.createOscillator();
        const gain = off.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(195, 0);
        osc.frequency.exponentialRampToValueAtTime(280, 0.045);
        gain.gain.setValueAtTime(0.001, 0);
        gain.gain.linearRampToValueAtTime(0.11, 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, 0.055);
        osc.connect(gain);
        gain.connect(off.destination);
        osc.start(0);
        osc.stop(0.06);
      });

      const dropPromises = Array.from({ length: 6 }, (_, idx) =>
        this.renderOffline(sampleRate, 0.045, (off) => {
          const osc = off.createOscillator();
          const gain = off.createGain();
          const filter = off.createBiquadFilter();
          const baseFreq = 420 + idx * 24;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq, 0);
          osc.frequency.exponentialRampToValueAtTime(150, 0.032);
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(820, 0);
          filter.Q.setValueAtTime(2.2, 0);
          gain.gain.setValueAtTime(0.001, 0);
          gain.gain.linearRampToValueAtTime(0.16, 0.002);
          gain.gain.exponentialRampToValueAtTime(0.001, 0.038);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(off.destination);
          osc.start(0);
          osc.stop(0.042);
        })
      );

      const capturePromise = this.renderOffline(sampleRate, 0.22, (off) => {
        const sub = off.createOscillator();
        const subGain = off.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(155, 0);
        sub.frequency.exponentialRampToValueAtTime(64, 0.14);
        subGain.gain.setValueAtTime(0.001, 0);
        subGain.gain.linearRampToValueAtTime(0.28, 0.003);
        subGain.gain.exponentialRampToValueAtTime(0.001, 0.17);
        sub.connect(subGain);
        subGain.connect(off.destination);
        sub.start(0);
        sub.stop(0.18);

        [196.0, 293.66, 392.0].forEach((freq, idx) => {
          const osc = off.createOscillator();
          const gain = off.createGain();
          const start = idx * 0.016;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.13, start + 0.003);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);
          osc.connect(gain);
          gain.connect(off.destination);
          osc.start(start);
          osc.stop(start + 0.21);
        });
      });

      const victoryPromise = this.renderOffline(sampleRate, 0.85, (off) => {
        [392.0, 493.88, 587.33, 783.99, 987.77].forEach((freq, idx) => {
          const osc = off.createOscillator();
          const gain = off.createGain();
          const start = idx * 0.085;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.001, start);
          gain.gain.linearRampToValueAtTime(0.16, start + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.44);
          osc.connect(gain);
          gain.connect(off.destination);
          osc.start(start);
          osc.stop(start + 0.48);
        });
      });

      const [pickup, drops, capture, victory] = await Promise.all([
        pickupPromise,
        Promise.all(dropPromises),
        capturePromise,
        victoryPromise,
      ]);
      this.pickupBuffer = pickup;
      this.dropBuffers = drops.filter((b): b is AudioBuffer => b !== null);
      this.captureBuffer = capture;
      this.victoryBuffer = victory;
      this.preloaded = true;
    } catch {
      // ignore
    } finally {
      this.preloading = false;
    }
  }

  private playBuffer(buffer: AudioBuffer | null): boolean {
    if (!buffer || this.muted) return false;
    const ctx = this.getContext();
    if (!ctx) return false;
    try {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start(0);
      return true;
    } catch {
      return false;
    }
  }

  public unlock(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // ignore unlock errors
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      localStorage.setItem('mraha_muted', muted ? '1' : '0');
    } catch {
      // ignore storage errors
    }
    if (muted) {
      this.stopAmbientLoop();
    } else if (this.ambientEnabled) {
      this.startAmbientLoop();
    }
  }

  public isVibrationEnabled(): boolean {
    return this.vibrationEnabled;
  }

  public setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    try {
      localStorage.setItem('mraha_vibration', enabled ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }

  public isAmbientEnabled(): boolean {
    return this.ambientEnabled;
  }

  public setAmbientEnabled(enabled: boolean): void {
    this.ambientEnabled = enabled;
    try {
      localStorage.setItem('mraha_ambient', enabled ? '1' : '0');
    } catch {
      // ignore
    }
    if (enabled && !this.muted) {
      this.startAmbientLoop();
    } else {
      this.stopAmbientLoop();
    }
  }

  private startAmbientLoop(): void {
    if (typeof window === 'undefined' || this.ambientTimer !== null || this.muted) return;
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    let step = 0;

    const tick = () => {
      if (!this.ambientEnabled || this.muted) return;
      const ctx = this.getContext();
      if (ctx) {
        try {
          const now = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const freq = pentatonic[(step * 3 + (step % 2)) % pentatonic.length];
          step++;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.025, now + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.0005, now + 1.8);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.9);
        } catch {
          // ignore
        }
      }
      this.ambientTimer = window.setTimeout(tick, 2200 + (step % 3) * 700);
    };

    this.ambientTimer = window.setTimeout(tick, 900);
  }

  private stopAmbientLoop(): void {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  public vibrate(pattern: number | number[]): void {
    try {
      if (!this.vibrationEnabled) return;
      const cap = (window as unknown as {
        Capacitor?: { Plugins?: { Haptics?: { impact: (opts: { style: string }) => Promise<void> } } };
      }).Capacitor;
      if (cap?.Plugins?.Haptics?.impact) {
        const style = Array.isArray(pattern) ? 'MEDIUM' : pattern >= 12 ? 'MEDIUM' : 'LIGHT';
        cap.Plugins.Haptics.impact({ style }).catch(() => {});
        return;
      }
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore vibration errors
    }
  }

  public playPickup(allowVibrate: boolean = true): void {
    if (allowVibrate) this.vibrate(10);
    if (this.playBuffer(this.pickupBuffer)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(195, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.045);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // ignore
    }
  }

  public playSeedDrop(stepIndex: number = 0, allowVibrate: boolean = true): void {
    if (allowVibrate) this.vibrate(8);
    if (this.dropBuffers.length > 0) {
      const buf = this.dropBuffers[stepIndex % this.dropBuffers.length];
      if (this.playBuffer(buf)) return;
    }
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const baseFreq = 420 + (stepIndex % 6) * 24;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.032);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(820, now);
      filter.Q.setValueAtTime(2.2, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.042);
    } catch {
      // ignore
    }
  }

  public playCapture(allowVibrate: boolean = true): void {
    if (allowVibrate) this.vibrate(20);
    if (this.playBuffer(this.captureBuffer)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(155, now);
      sub.frequency.exponentialRampToValueAtTime(64, now + 0.14);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.28, now + 0.003);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 0.18);
    } catch {
      // ignore
    }
  }

  public playVictory(): void {
    this.vibrate([30, 45, 50]);
    if (this.playBuffer(this.victoryBuffer)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const melody = [392.0, 493.88, 587.33, 783.99, 987.77];
      melody.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.085;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.44);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.48);
      });
    } catch {
      // ignore
    }
  }
}

export const soundEngine = new MrahaSoundEngine();
