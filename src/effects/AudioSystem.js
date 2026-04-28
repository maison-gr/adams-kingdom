class AudioSystem {
  constructor() {
    this._ctx   = null;
    this._muted = localStorage.getItem('audioMuted') === '1';
  }

  get isMuted() { return this._muted; }

  toggleMute() {
    this._muted = !this._muted;
    localStorage.setItem('audioMuted', this._muted ? '1' : '0');
    return this._muted;
  }

  _ctx_get() {
    if (!this._ctx) {
      try { this._ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (_) { return null; }
    }
    if (this._ctx.state === 'suspended') this._ctx.resume();
    return this._ctx;
  }

  _play(fn) {
    if (this._muted) return;
    try { const ctx = this._ctx_get(); if (ctx) fn(ctx); } catch (_) {}
  }

  _osc(ctx, type, freq, t0, t1, vol0, vol1 = 0) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol0, t0);
    g.gain.linearRampToValueAtTime(vol1, t1);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t0); osc.stop(t1 + 0.001);
  }

  _sweep(ctx, type, f0, f1, t0, t1, vol0, vol1 = 0) {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    osc.frequency.linearRampToValueAtTime(f1, t1);
    g.gain.setValueAtTime(vol0, t0);
    g.gain.linearRampToValueAtTime(vol1, t1);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t0); osc.stop(t1 + 0.001);
  }

  haptic(pattern) {
    try { navigator.vibrate?.(pattern); } catch (_) {}
  }

  // Short click during wheel spin
  tick() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._osc(ctx, 'square', 880, t, t + 0.04, 0.10, 0);
    });
  }

  // Thud when wheel stops
  wheelStop() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'sine', 200, 80, t, t + 0.18, 0.28, 0);
    });
  }

  // Ascending coin jingle
  coin() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [523, 659, 784].forEach((f, i) =>
        this._osc(ctx, 'sine', f, t + i * 0.07, t + i * 0.07 + 0.18, 0.15, 0)
      );
    });
    this.haptic(10);
  }

  // Low aggressive hit for attacks
  attack() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'sawtooth', 220, 110, t, t + 0.28, 0.30, 0);
      this._osc(ctx, 'square', 55, t, t + 0.32, 0.22, 0);
    });
    this.haptic([50, 30, 50]);
  }

  // Mid sweep for raids
  raid() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [330, 440, 554].forEach((f, i) =>
        this._sweep(ctx, 'triangle', f, f * 1.25, t + i * 0.10, t + i * 0.10 + 0.22, 0.16, 0)
      );
    });
    this.haptic([30, 20, 60]);
  }

  // Soft bell for shield
  shield() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._osc(ctx, 'sine', 880,  t,        t + 0.38, 0.18, 0);
      this._osc(ctx, 'sine', 1108, t + 0.10, t + 0.42, 0.12, 0);
    });
    this.haptic(20);
  }

  // Quick arpeggio for extra spin reward
  spin() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) =>
        this._osc(ctx, 'triangle', f, t + i * 0.06, t + i * 0.06 + 0.15, 0.13, 0)
      );
    });
    this.haptic(15);
  }

  // Multi-note jackpot fanfare
  jackpot() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [523, 659, 784, 1046, 1318].forEach((f, i) => {
        this._osc(ctx, 'sine',     f,     t + i * 0.10, t + i * 0.10 + 0.35, 0.22, 0);
        this._osc(ctx, 'triangle', f * 2, t + i * 0.10, t + i * 0.10 + 0.15, 0.08, 0);
      });
    });
    this.haptic([100, 50, 100]);
  }

  // Descending whoosh for near-miss
  nearMiss() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'sawtooth', 880, 220, t, t + 0.48, 0.16, 0);
    });
  }

  // Energetic rising power-up for fever mode
  fever() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'sawtooth', 220, 880, t,        t + 0.38, 0.18, 0.08);
      this._sweep(ctx, 'square',   440, 1760, t + 0.20, t + 0.50, 0.10, 0);
    });
    this.haptic([50, 20, 50, 20, 50]);
  }

  // Dramatic reveal for chest opening
  chest() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'sine', 180, 440, t, t + 0.22, 0.28, 0.10);
      [523, 659, 784, 1046].forEach((f, i) =>
        this._osc(ctx, 'sine', f, t + 0.18 + i * 0.09, t + 0.18 + i * 0.09 + 0.22, 0.18, 0)
      );
    });
    this.haptic([40, 20, 80]);
  }

  // 6-note ascending fanfare for rank-up
  rankUp() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => {
        this._osc(ctx, 'sine', f, t + i * 0.12, t + i * 0.12 + 0.35, 0.20, 0);
        if (i === 5) {
          this._osc(ctx, 'triangle', f * 1.5, t + i * 0.12 + 0.10, t + i * 0.12 + 0.80, 0.12, 0);
        }
      });
    });
    this.haptic([100, 50, 100, 50, 200]);
  }

  // Card set complete sting
  setComplete() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [659, 784, 987, 1318].forEach((f, i) => {
        this._osc(ctx, 'sine',     f,       t + i * 0.14, t + i * 0.14 + 0.42, 0.22, 0);
        this._osc(ctx, 'triangle', f * 1.5, t + i * 0.14, t + i * 0.14 + 0.22, 0.08, 0);
      });
    });
    this.haptic([80, 40, 80, 40, 120]);
  }

  // Grand fanfare for village completion
  villageComplete() {
    this._play(ctx => {
      const t = ctx.currentTime;
      [523, 659, 523, 659, 784, 1046].forEach((f, i) => {
        this._osc(ctx, 'sine',     f,       t + i * 0.15, t + i * 0.15 + 0.38, 0.22, 0);
        this._osc(ctx, 'triangle', f * 0.5, t + i * 0.15, t + i * 0.15 + 0.28, 0.10, 0);
      });
      [130, 165, 196].forEach((f, i) =>
        this._osc(ctx, 'sine', f, t + i * 0.30, t + i * 0.30 + 0.50, 0.16, 0)
      );
    });
    this.haptic([200, 100, 200]);
  }

  // Quick rising tone for building upgrade
  upgrade() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'triangle', 440, 880, t, t + 0.18, 0.16, 0);
      this._osc(ctx, 'sine', 1046, t + 0.16, t + 0.32, 0.12, 0);
    });
    this.haptic(15);
  }

  // Rising whoosh at spin launch
  spinLaunch() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._sweep(ctx, 'sine',     80,  420, t,        t + 0.38, 0.22, 0.04);
      this._sweep(ctx, 'triangle', 160, 880, t + 0.06, t + 0.32, 0.10, 0);
    });
    this.haptic(18);
  }

  // ─── BACKGROUND MUSIC ────────────────────────────────────────────────────

  // Looping pentatonic arpeggio — no audio files required.
  startBGM() {
    if (this._bgmTimer) return;
    const notes  = [261.63, 329.63, 392, 523.25, 659.25]; // C pentatonic
    const drone  = 65.41;                                  // C2 bass
    let   step   = 0;
    const BEAT   = 0.32;

    const tick = () => {
      if (this._muted || !this._bgmTimer) return;
      const ctx = this._ctx_get();
      if (!ctx) return;
      const t = ctx.currentTime;

      // Arpeggio note
      const freq = notes[step % notes.length] * (step < notes.length ? 1 : 2);
      this._osc(ctx, 'triangle', freq, t, t + BEAT * 0.7, 0.055, 0);

      // Bass drone every 4 steps
      if (step % 4 === 0) {
        this._osc(ctx, 'sine', drone, t, t + BEAT * 3.5, 0.07, 0);
      }

      step = (step + 1) % (notes.length * 2);
    };

    tick();
    this._bgmTimer = setInterval(tick, BEAT * 1000);
  }

  stopBGM() {
    if (this._bgmTimer) { clearInterval(this._bgmTimer); this._bgmTimer = null; }
  }

  // Short cut-off bell ting — jackpot crossing the pointer
  jackpotPassthrough() {
    this._play(ctx => {
      const t = ctx.currentTime;
      this._osc(ctx, 'sine',     1568, t,        t + 0.11, 0.22, 0.05);
      this._osc(ctx, 'triangle', 1318, t + 0.02, t + 0.09, 0.10, 0);
    });
    this.haptic(6);
  }
}

export const audioSystem = new AudioSystem();
