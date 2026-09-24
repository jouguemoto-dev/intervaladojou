// Web Audio API & Web Speech API Audio Engine with Loud Profiles & Vibration

import { SoundProfile } from '../types/workout';

class AudioAlertEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dynamicsCompressor: DynamicsCompressorNode | null = null;

  private ttsMuted = false;
  private beepsMuted = false;
  private volumeLevel = 1.0; // 0.2 to 2.0 (boosted)
  private currentProfile: SoundProfile = 'whistle';
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Prioritize Brazilian Portuguese voice
    const ptBrVoice = voices.find((v) => v.lang === 'pt-BR' || v.lang.startsWith('pt'));
    if (ptBrVoice) {
      this.selectedVoice = ptBrVoice;
    }
  }

  public unlockAudio() {
    if (this.isUnlocked && this.audioCtx && this.audioCtx.state === 'running') return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        if (!this.audioCtx) {
          this.audioCtx = new AudioContextClass();
        }
        if (this.audioCtx.state === 'suspended') {
          this.audioCtx.resume();
        }

        // Setup master compressor & gain to maximize perceived loudness without harsh distortion
        if (!this.dynamicsCompressor) {
          this.dynamicsCompressor = this.audioCtx.createDynamicsCompressor();
          this.dynamicsCompressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
          this.dynamicsCompressor.knee.setValueAtTime(10, this.audioCtx.currentTime);
          this.dynamicsCompressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
          this.dynamicsCompressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
          this.dynamicsCompressor.release.setValueAtTime(0.15, this.audioCtx.currentTime);
          this.dynamicsCompressor.connect(this.audioCtx.destination);
        }

        if (!this.masterGain) {
          this.masterGain = this.audioCtx.createGain();
          this.masterGain.gain.setValueAtTime(this.volumeLevel, this.audioCtx.currentTime);
          this.masterGain.connect(this.dynamicsCompressor);
        }

        this.isUnlocked = true;
      }
    } catch {
      // AudioContext unlock
    }
  }

  public setSoundProfile(profile: SoundProfile) {
    this.currentProfile = profile;
  }

  public getSoundProfile(): SoundProfile {
    return this.currentProfile;
  }

  public setVolume(vol: number) {
    this.volumeLevel = Math.max(0.1, Math.min(2.5, vol));
    if (this.audioCtx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volumeLevel, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  public setTtsMuted(muted: boolean) {
    this.ttsMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isTtsMuted(): boolean {
    return this.ttsMuted;
  }

  public setBeepsMuted(muted: boolean) {
    this.beepsMuted = muted;
  }

  public isBeepsMuted(): boolean {
    return this.beepsMuted;
  }

  /**
   * Triggers device haptic vibration if supported (great for runners with phone in pocket or armband)
   */
  public vibrate(pattern: number | number[]) {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration error
      }
    }
  }

  /**
   * Countdown tick (3, 2, 1) according to selected sound profile
   */
  public playCountdownTick(number: number) {
    if (this.beepsMuted) return;
    this.unlockAudio();
    if (!this.audioCtx || !this.masterGain) return;

    this.vibrate(80);

    const now = this.audioCtx.currentTime;

    switch (this.currentProfile) {
      case 'whistle': {
        // High-pitched referee prep pip
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(number === 1 ? 2800 : 2200, now);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'siren': {
        // Staccato buzzer tick
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(number === 1 ? 1200 : 900, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'high_digital': {
        // Very loud piercing digital pip (2400Hz)
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(number === 1 ? 2600 : 2100, now);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'boxing_bell': {
        // Metallic ding
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(number === 1 ? 1400 : 1050, now);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'classic':
      default: {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(number === 1 ? 950 : 800, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
    }
  }

  /**
   * Main Loud Phase Change Alert / Whistle / Gong
   */
  public playPhaseChangeAlert() {
    if (this.beepsMuted) return;
    this.unlockAudio();
    if (!this.audioCtx || !this.masterGain) return;

    this.vibrate([250, 100, 350]);

    const now = this.audioCtx.currentTime;

    switch (this.currentProfile) {
      case 'whistle': {
        // Penetrating sports whistle with dual frequency trill and amplitude modulation
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        // LFO for referee whistle trill (fluttering air effect)
        const lfo = this.audioCtx.createOscillator();
        const lfoGain = this.audioCtx.createGain();
        lfo.frequency.setValueAtTime(32, now); // 32 Hz trill
        lfoGain.gain.setValueAtTime(140, now);
        lfo.connect(lfoGain);

        osc1.type = 'triangle';
        osc2.type = 'triangle';

        osc1.frequency.setValueAtTime(2600, now);
        osc2.frequency.setValueAtTime(2850, now);

        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        gain.gain.setValueAtTime(0.85, now);
        gain.gain.setValueAtTime(0.85, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        lfo.start(now);
        osc1.start(now);
        osc2.start(now);

        lfo.stop(now + 0.55);
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
        break;
      }

      case 'siren': {
        // High-decibel gym horn / airhorn burst
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.linearRampToValueAtTime(1600, now + 0.2);
        osc.frequency.setValueAtTime(1600, now + 0.2);

        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }

      case 'high_digital': {
        // Triple loud digital beep (2800 Hz)
        [0, 0.12, 0.24].forEach((delay) => {
          if (!this.audioCtx || !this.masterGain) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          const t = now + delay;

          osc.type = 'square';
          osc.frequency.setValueAtTime(2800, t);
          gain.gain.setValueAtTime(0.5, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.start(t);
          osc.stop(t + 0.08);
        });
        break;
      }

      case 'boxing_bell': {
        // Classic boxing ring bell chime with overtones
        const baseFreq = 980;
        [1, 2.76, 5.4].forEach((harmonic, idx) => {
          if (!this.audioCtx || !this.masterGain) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * harmonic, now);

          const vol = 0.7 / (idx + 1);
          gain.gain.setValueAtTime(vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.start(now);
          osc.stop(now + 0.7);
        });
        break;
      }

      case 'classic':
      default: {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(1800, now + 0.18);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
    }
  }

  public playCompletionFanfare() {
    if (this.beepsMuted) return;
    this.unlockAudio();
    this.vibrate([150, 100, 150, 100, 400]);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.audioCtx || !this.masterGain) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.3);
      }, idx * 150);
    });
  }

  /**
   * Test current sound profile live
   */
  public testCurrentSound() {
    this.unlockAudio();
    this.playCountdownTick(3);
    setTimeout(() => this.playCountdownTick(2), 250);
    setTimeout(() => this.playCountdownTick(1), 500);
    setTimeout(() => {
      this.playPhaseChangeAlert();
      this.speak('Alerta sonoro testado com sucesso!');
    }, 750);
  }

  /**
   * Native Text-to-Speech synthesis in Portuguese
   */
  public speak(text: string) {
    if (this.ttsMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.05;
      utterance.lang = 'pt-BR';
      utterance.volume = Math.min(1.0, this.volumeLevel);

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech fallback
    }
  }

  public stopAll() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioAlerts = new AudioAlertEngine();

export const SOUND_PROFILES: { id: SoundProfile; name: string; description: string; tag: string }[] = [
  {
    id: 'whistle',
    name: 'Apito Esportivo / Juiz',
    description: 'Som penetrante de apito duplo modulado (2600Hz-2850Hz) com trinado de ar. Ideal para ruas barulhentas.',
    tag: 'Mais Alto',
  },
  {
    id: 'siren',
    name: 'Sirene / Buzzer de Boxe',
    description: 'Som encorpado de buzina de academia/ringue de alta intensidade.',
    tag: 'Impacto',
  },
  {
    id: 'high_digital',
    name: 'Bip Digital Ultra Alto',
    description: 'Sequência staccato aguda (2800Hz) com máxima clareza mesmo com fone em volume baixo.',
    tag: 'Penetrante',
  },
  {
    id: 'boxing_bell',
    name: 'Gongo / Sino Metálico',
    description: 'Ressonância metálica de sino de ringue com harmônicos limpos.',
    tag: 'Clássico Ringue',
  },
  {
    id: 'classic',
    name: 'Bip Tradicional de Cronômetro',
    description: 'Bip suave tradicional de cronômetro digital esportivo.',
    tag: 'Padrão',
  },
];
