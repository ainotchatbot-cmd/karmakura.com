// Client-side PCM helpers for Gemini Live API (16kHz input, 24kHz output)
// plus pure Web Audio meditative lotus-pond & singing-bowl synthesizer.

export function float32ToBase64Pcm16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i += 1) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function base64Pcm16ToAudioBuffer(
  ctx: AudioContext,
  base64: string,
  sampleRate = 24000
): { buffer: AudioBuffer; rms: number } {
  const binary = atob(base64);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  let sumSq = 0;
  for (let i = 0; i < int16.length; i += 1) {
    const sample = int16[i] / 32768;
    float32[i] = sample;
    sumSq += sample * sample;
  }
  const buffer = ctx.createBuffer(1, float32.length, sampleRate);
  buffer.getChannelData(0).set(float32);
  const rms = float32.length > 0 ? Math.sqrt(sumSq / float32.length) : 0;
  return { buffer, rms };
}

export class TempleAmbientSoundscape {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private bellTimer: number | null = null;
  private frogTimer: number | null = null;
  private running = false;

  public isRunning(): boolean {
    return this.running;
  }

  public start(volume = 0.25): void {
    if (this.running) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(Math.max(0.01, Math.min(0.6, volume)), ctx.currentTime);
    master.connect(ctx.destination);
    this.masterGain = master;

    // Gentle night rain / temple breeze pink-filtered noise
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = noiseBuf.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      out[i] = (b0 + b1 + b2) * 0.14;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(520, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.32, ctx.currentTime);

    noise.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();
    this.noiseSource = noise;

    // Warm low meditative temple harmonic drone (D2 + A2)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(73.42, ctx.currentTime);
    osc2.frequency.setValueAtTime(110.0, ctx.currentTime);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.07, ctx.currentTime);

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(240, ctx.currentTime);

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(master);
    osc1.start();
    osc2.start();
    this.droneOsc1 = osc1;
    this.droneOsc2 = osc2;

    // Periodic bronze singing bowl chime
    const playBowl = () => {
      if (!this.ctx || !this.masterGain || !this.running) return;
      const now = this.ctx.currentTime;
      const bowl = this.ctx.createOscillator();
      const overtone = this.ctx.createOscillator();
      const g = this.ctx.createGain();

      bowl.type = 'sine';
      overtone.type = 'sine';
      bowl.frequency.setValueAtTime(293.66, now); // D4
      overtone.frequency.setValueAtTime(587.33, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.09, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);

      bowl.connect(g);
      overtone.connect(g);
      g.connect(this.masterGain);
      bowl.start(now);
      overtone.start(now);
      bowl.stop(now + 5.0);
      overtone.stop(now + 5.0);
    };

    playBowl();
    this.bellTimer = window.setInterval(playBowl, 11000);

    // Subtle pond frog croak ambience
    const playFrog = () => {
      if (!this.ctx || !this.masterGain || !this.running) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filt = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(92, now);
      osc.frequency.exponentialRampToValueAtTime(64, now + 0.16);

      filt.type = 'bandpass';
      filt.frequency.setValueAtTime(340, now);
      filt.Q.setValueAtTime(3.2, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.045, now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(filt);
      filt.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    };

    this.frogTimer = window.setInterval(() => {
      if (Math.random() > 0.35) playFrog();
    }, 6200);

    this.running = true;
  }

  public setVolume(volume: number): void {
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0.01, Math.min(0.6, volume)),
        this.ctx.currentTime,
        0.08
      );
    }
  }

  public stop(): void {
    this.running = false;
    if (this.bellTimer !== null) {
      window.clearInterval(this.bellTimer);
      this.bellTimer = null;
    }
    if (this.frogTimer !== null) {
      window.clearInterval(this.frogTimer);
      this.frogTimer = null;
    }
    try {
      this.noiseSource?.stop();
      this.droneOsc1?.stop();
      this.droneOsc2?.stop();
    } catch {
      // ignore stop errors
    }
    this.noiseSource = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.masterGain = null;
  }
}
