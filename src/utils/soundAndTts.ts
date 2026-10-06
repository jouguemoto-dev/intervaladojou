// Web Audio API & Web Speech API Audio Engine with Loud Distinct Profiles & Vibration

import { SoundProfile, PhaseType } from '../types/workout';
import { WebAudioVoiceSynthesizer } from './audioCueSynthesizer';

class AudioAlertEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private dynamicsCompressor: DynamicsCompressorNode | null = null;
  private silentAudioElement: HTMLAudioElement | null = null;
  private keepAliveOsc: OscillatorNode | null = null;
  private keepAliveGain: GainNode | null = null;
  private voiceSynthesizer: WebAudioVoiceSynthesizer | null = null;

  private ttsMuted = false;
  private beepsMuted = false;
  private volumeLevel = 1.0; // 0.2 to 2.0 (boosted)
  private currentProfile: SoundProfile = 'whistle';
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isUnlocked = false;
  private activeUtterances = new Set<SpeechSynthesisUtterance>();
  private speechWatchdog: any = null;
  private speechResumeHeartbeat: any = null;
  private lastSpeakStartTime = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }

      // Re-arm AudioContext and SpeechSynthesis whenever the app returns to foreground
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
          if ('speechSynthesis' in window) {
            try {
              if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
              }
            } catch {}
          }
        }
      });
    }
  }

  /**
   * Starts a continuous, real audio stream loop in the background to prevent Chrome/Safari/Android
   * from suspending the audio session, Web Worker, or tab when the user locks the screen or switches apps.
   */
  public startBackgroundKeepAlive(title = 'Júlio César Ritmo Intervalo') {
    if (typeof window === 'undefined') return;

    try {
      this.unlockAudio();

      if (!this.silentAudioElement) {
        // Continuous generated audio buffer with standard valid WAV RIFF header
        const silentWavBase64 =
          'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRAAAAAAAP//AAAAAAAA//8AAP//';
        const audio = new Audio(silentWavBase64);
        audio.loop = true;
        audio.volume = 0.02;
        this.silentAudioElement = audio;
      }

      this.silentAudioElement.play().catch(() => {});

      // Continuous low-frequency oscillator connected to destination
      // Tells Android OS audio HAL and Chrome kernel that audio is actively generating,
      // preventing background process freezes or worker suspensions when the screen locks!
      if (this.audioCtx && !this.keepAliveOsc) {
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(35, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          this.keepAliveOsc = osc;
          this.keepAliveGain = gain;
        } catch {}
      }

      // Keep waking up audio and resuming AudioContext
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Integrate with Android / iOS Notification Lockscreen Controls (MediaSession API)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title,
          artist: 'Júlio César Ritmo Intervalo',
          album: 'Treino Intervalado em Execução (Segundo Plano Ativo)',
          artwork: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        });
        navigator.mediaSession.playbackState = 'playing';
      }
    } catch (err) {
      console.warn('Background keep-alive setup error:', err);
    }
  }

  public stopBackgroundKeepAlive() {
    if (this.silentAudioElement) {
      try {
        this.silentAudioElement.pause();
        this.silentAudioElement.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    if (this.keepAliveOsc) {
      try {
        this.keepAliveOsc.stop();
        this.keepAliveOsc.disconnect();
      } catch {}
      this.keepAliveOsc = null;
      this.keepAliveGain = null;
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
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

        if (!this.voiceSynthesizer && this.masterGain) {
          this.voiceSynthesizer = new WebAudioVoiceSynthesizer(this.audioCtx, this.masterGain);
        }

        this.isUnlocked = true;
      }
    } catch {
      // AudioContext unlock
    }
  }

  /**
   * Plays a guaranteed audio/voice cue through Web Audio API
   * Guaranteed to work even when Android freezes SpeechSynthesis with screen locked
   */
  public playVoiceCue(cue: 'tiro' | 'trote' | 'caminhada' | 'descanso' | 'aquecimento' | 'atencao' | 'metade' | 'parabens') {
    if (this.ttsMuted) return;
    this.unlockAudio();
    if (this.voiceSynthesizer) {
      this.voiceSynthesizer.playSpokenCue(cue);
    }
  }

  public setSoundProfile(profile: SoundProfile) {
    this.currentProfile = profile;
  }

  public getSoundProfile(): SoundProfile {
    return this.currentProfile;
  }

  public setVolume(level: number) {
    this.volumeLevel = Math.max(0.1, Math.min(2.0, level));
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
   * Main Phase Change Alert: Distinctly tuned for CORRIDA FORTE (Tiro) vs TROTE LEVE / Caminhada
   * @param phase The target workout phase
   */
  public playPhaseChangeAlert(phase?: PhaseType) {
    if (this.beepsMuted) return;
    this.unlockAudio();
    if (!this.audioCtx || !this.masterGain) return;

    const isSprint = phase === 'high_intensity';
    const isJog = phase === 'low_intensity';

    // Different vibration signature:
    // Tiro forte: 3 pulsos fortes e agressivos
    // Trote leve: 2 pulsos médios e suaves
    if (isSprint) {
      this.vibrate([350, 80, 200, 80, 450]);
    } else if (isJog) {
      this.vibrate([180, 100, 180]);
    } else {
      this.vibrate([250, 100, 350]);
    }

    const now = this.audioCtx.currentTime;

    switch (this.currentProfile) {
      case 'whistle': {
        if (isSprint) {
          // CORRIDA FORTE (TIRO): Apito esportivo duplo ultra penetrante com trinado enérgico de 35Hz
          // Dois sopros rápidos e agudos: "FIII-FIIII!"
          [0, 0.26].forEach((delay, idx) => {
            if (!this.audioCtx || !this.masterGain) return;
            const t = now + delay;
            const duration = idx === 1 ? 0.38 : 0.20;

            const osc1 = this.audioCtx.createOscillator();
            const osc2 = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            const lfo = this.audioCtx.createOscillator();
            const lfoGain = this.audioCtx.createGain();
            lfo.frequency.setValueAtTime(36, t);
            lfoGain.gain.setValueAtTime(160, t);
            lfo.connect(lfoGain);

            osc1.type = 'triangle';
            osc2.type = 'triangle';
            // Frequência bem alta e aguda para despertar a corrida máxima
            osc1.frequency.setValueAtTime(2800, t);
            osc2.frequency.setValueAtTime(3100, t);

            lfoGain.connect(osc1.frequency);
            lfoGain.connect(osc2.frequency);

            gain.gain.setValueAtTime(0.9, t);
            gain.gain.setValueAtTime(0.9, t + duration - 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.masterGain);

            lfo.start(t);
            osc1.start(t);
            osc2.start(t);

            lfo.stop(t + duration);
            osc1.stop(t + duration);
            osc2.stop(t + duration);
          });
        } else if (isJog) {
          // TROTE LEVE: Sopro de apito mais longo, encorpado, suave e em tom médio (1800Hz-2050Hz)
          // "Fuuuuuuu" (aviso de ritmo moderado/recuperação)
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          const lfo = this.audioCtx.createOscillator();
          const lfoGain = this.audioCtx.createGain();
          lfo.frequency.setValueAtTime(20, now);
          lfoGain.gain.setValueAtTime(60, now);
          lfo.connect(lfoGain);

          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(1850, now);
          osc2.frequency.setValueAtTime(2100, now);

          lfoGain.connect(osc1.frequency);
          lfoGain.connect(osc2.frequency);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.65, now + 0.06);
          gain.gain.setValueAtTime(0.65, now + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.masterGain);

          lfo.start(now);
          osc1.start(now);
          osc2.start(now);

          lfo.stop(now + 0.6);
          osc1.stop(now + 0.6);
          osc2.stop(now + 0.6);
        } else {
          // Caminhada / Descanso / Aquecimento / Genérico
          const osc1 = this.audioCtx.createOscillator();
          const osc2 = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc1.type = 'triangle';
          osc2.type = 'triangle';
          osc1.frequency.setValueAtTime(2200, now);
          osc2.frequency.setValueAtTime(2500, now);

          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.45);
          osc2.stop(now + 0.45);
        }
        break;
      }

      case 'siren': {
        if (isSprint) {
          // CORRIDA FORTE: Sirene de alta energia em duplo pulso acelerado subindo até 1800Hz
          [0, 0.24].forEach((delay) => {
            if (!this.audioCtx || !this.masterGain) return;
            const t = now + delay;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.linearRampToValueAtTime(1800, t + 0.16);

            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.22);
          });
        } else if (isJog) {
          // TROTE LEVE: Tom grave constante e suave (600Hz decaindo para 500Hz)
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.linearRampToValueAtTime(500, now + 0.45);

          gain.gain.setValueAtTime(0.65, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

          osc.connect(gain);
          gain.connect(this.masterGain);

          osc.start(now);
          osc.stop(now + 0.5);
        } else {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(700, now);
          osc.frequency.linearRampToValueAtTime(1400, now + 0.25);
          gain.gain.setValueAtTime(0.7, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.4);
        }
        break;
      }

      case 'high_digital': {
        if (isSprint) {
          // CORRIDA FORTE: Sequência frenética de 4 bips curtos ultra agudos (3200Hz)
          [0, 0.08, 0.16, 0.24].forEach((delay) => {
            if (!this.audioCtx || !this.masterGain) return;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const t = now + delay;

            osc.type = 'square';
            osc.frequency.setValueAtTime(3200, t);
            gain.gain.setValueAtTime(0.6, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.06);
          });
        } else if (isJog) {
          // TROTE LEVE: Duplo bip melódico descendente suave (1800Hz -> 1400Hz)
          [
            { delay: 0, freq: 1800 },
            { delay: 0.18, freq: 1400 },
          ].forEach(({ delay, freq }) => {
            if (!this.audioCtx || !this.masterGain) return;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const t = now + delay;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.14);
          });
        } else {
          [0, 0.14].forEach((delay) => {
            if (!this.audioCtx || !this.masterGain) return;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            const t = now + delay;
            osc.type = 'square';
            osc.frequency.setValueAtTime(2400, t);
            gain.gain.setValueAtTime(0.5, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.09);
          });
        }
        break;
      }

      case 'boxing_bell': {
        if (isSprint) {
          // CORRIDA FORTE: Toque duplo de sino de ringue vibrante
          [0, 0.22].forEach((delay) => {
            if (!this.audioCtx || !this.masterGain) return;
            const t = now + delay;
            const baseFreq = 1200;
            [1, 2.76].forEach((harmonic, idx) => {
              if (!this.audioCtx || !this.masterGain) return;
              const osc = this.audioCtx.createOscillator();
              const gain = this.audioCtx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(baseFreq * harmonic, t);
              gain.gain.setValueAtTime(0.7 / (idx + 1), t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
              osc.connect(gain);
              gain.connect(this.masterGain);
              osc.start(t);
              osc.stop(t + 0.45);
            });
          });
        } else if (isJog) {
          // TROTE LEVE: Sino grave com ressonância suave (750Hz)
          const baseFreq = 750;
          [1, 2.0].forEach((harmonic, idx) => {
            if (!this.audioCtx || !this.masterGain) return;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq * harmonic, now);
            gain.gain.setValueAtTime(0.6 / (idx + 1), now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(now);
            osc.stop(now + 0.7);
          });
        } else {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(950, now);
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.5);
        }
        break;
      }

      case 'classic':
      default: {
        if (isSprint) {
          // CORRIDA FORTE: Bip clássico em tom agudo duplo ascendente (1500Hz -> 2200Hz)
          [0, 0.18].forEach((delay) => {
            if (!this.audioCtx || !this.masterGain) return;
            const t = now + delay;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1500, t);
            osc.frequency.linearRampToValueAtTime(2200, t + 0.12);
            gain.gain.setValueAtTime(0.8, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.16);
          });
        } else if (isJog) {
          // TROTE LEVE: Bip único em tom suave e amigável (900Hz)
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(900, now);
          gain.gain.setValueAtTime(0.65, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.35);
        } else {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200, now);
          gain.gain.setValueAtTime(0.6, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.3);
        }
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
   * Loud celebratory alarm and Portuguese voice cue when a fasting goal is completed
   */
  public playFastingCompletionAlarm(targetHours: number) {
    this.unlockAudio();
    this.vibrate([200, 100, 200, 100, 400, 100, 500]);

    // 1. Play ringing celebratory chimes
    const chimeFrequencies = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chimeFrequencies.forEach((freq, idx) => {
      setTimeout(() => {
        if (!this.audioCtx || !this.masterGain) return;
        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.45);
      }, idx * 120);
    });

    // 2. Play distinct resonant ringing bell sequence
    setTimeout(() => {
      if (!this.audioCtx || !this.masterGain) return;
      const now = this.audioCtx.currentTime;
      [880, 1108.73, 1318.51].forEach((freq) => {
        if (!this.audioCtx || !this.masterGain) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.8);
      });
    }, 850);

    // 3. Clear, loud Portuguese voice announcement
    setTimeout(() => {
      this.speak(
        `Atenção! Parabéns! Você concluiu sua meta de ${targetHours} horas de jejum com sucesso! Seu próximo estágio foi liberado!`
      );
    }, 1100);
  }

  /**
   * Test current sound profile live with sprint and jog demonstration
   */
  public testCurrentSound(phase: PhaseType = 'high_intensity') {
    this.unlockAudio();
    this.playCountdownTick(3);
    setTimeout(() => this.playCountdownTick(2), 220);
    setTimeout(() => this.playCountdownTick(1), 440);
    setTimeout(() => {
      this.playPhaseChangeAlert(phase);
      if (phase === 'high_intensity') {
        this.playVoiceCue('tiro');
        this.speak('Corrida forte! Acelere!');
      } else {
        this.playVoiceCue('trote');
        this.speak('Trote leve. Recupere o fôlego.');
      }
    }, 660);
  }

  /**
   * Native Text-to-Speech synthesis in Portuguese (100% GC-safe & background-resilient)
   */
  public speak(text: string) {
    if (this.ttsMuted || !text || text.trim().length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      this.unlockAudio();

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      if (!this.selectedVoice) {
        const voices = window.speechSynthesis.getVoices();
        const ptBrVoice = voices.find((v) => v.lang === 'pt-BR' || v.lang.startsWith('pt'));
        if (ptBrVoice) {
          this.selectedVoice = ptBrVoice;
        }
      }

      // If browser is actively speaking previous phrase or speech is hung, cancel cleanly
      const isSpeakingOrHung = window.speechSynthesis.speaking;
      if (isSpeakingOrHung) {
        window.speechSynthesis.cancel();
      }

      const executeSpeak = () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          utterance.lang = 'pt-BR';
          utterance.volume = Math.min(1.0, this.volumeLevel);

          if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
          }

          // Protect from V8/WebKit garbage collector drop
          this.activeUtterances.add(utterance);
          if (typeof window !== 'undefined') {
            if (!(window as any).__activeTtsUtterances) {
              (window as any).__activeTtsUtterances = [];
            }
            (window as any).__activeTtsUtterances.push(utterance);
            if ((window as any).__activeTtsUtterances.length > 8) {
              (window as any).__activeTtsUtterances.shift();
            }
          }

          this.lastSpeakStartTime = Date.now();

          // Chrome TTS freeze fix: ping resume() every 2 seconds while speech is active
          if (!this.speechResumeHeartbeat) {
            this.speechResumeHeartbeat = setInterval(() => {
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                if (window.speechSynthesis.speaking) {
                  window.speechSynthesis.resume();
                } else if (this.activeUtterances.size === 0) {
                  clearInterval(this.speechResumeHeartbeat);
                  this.speechResumeHeartbeat = null;
                }
              }
            }, 2000);
          }

          const cleanup = () => {
            this.activeUtterances.delete(utterance);
            if (this.speechWatchdog) {
              clearTimeout(this.speechWatchdog);
              this.speechWatchdog = null;
            }
          };

          utterance.onend = cleanup;
          utterance.onerror = (e) => {
            cleanup();
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
              console.warn('SpeechSynthesis error:', e.error);
            }
          };

          // Watchdog: If browser speech gets stuck for more than 8 seconds, unfreeze the engine
          if (this.speechWatchdog) {
            clearTimeout(this.speechWatchdog);
          }
          this.speechWatchdog = setTimeout(() => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
              window.speechSynthesis.cancel();
              this.activeUtterances.clear();
            }
          }, 8000);

          window.speechSynthesis.speak(utterance);
        } catch {
          // Speech fallback
        }
      };

      if (isSpeakingOrHung) {
        // Safe 80ms delay gives Android TextToSpeech engine time to reset its audio track cleanly
        setTimeout(executeSpeak, 80);
      } else {
        // Micro-delay gives Android Chrome time to settle audio context
        setTimeout(executeSpeak, 25);
      }
    } catch {
      // Speech fallback
    }
  }

  public stopAll() {
    this.stopBackgroundKeepAlive();
    this.activeUtterances.clear();
    if (this.speechWatchdog) {
      clearTimeout(this.speechWatchdog);
      this.speechWatchdog = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }
}

export const audioAlerts = new AudioAlertEngine();

export const SOUND_PROFILES: { id: SoundProfile; name: string; description: string; tag: string }[] = [
  {
    id: 'whistle',
    name: 'Apito Esportivo / Juiz',
    description: 'Tiro forte: apito duplo agudo penetrante (2800-3100Hz). Trote leve: sopro suave e cadenciado.',
    tag: 'Mais Nítido',
  },
  {
    id: 'siren',
    name: 'Sirene / Buzzer de Boxe',
    description: 'Tiro forte: sirene rápida de subida esportiva. Trote leve: buzina grave e contínua de pausa ativa.',
    tag: 'Impacto',
  },
  {
    id: 'high_digital',
    name: 'Bip Digital Ultra Alto',
    description: 'Tiro forte: 4 pulsos rápidos agudos (3200Hz). Trote leve: 2 bips melódicos suaves descendentes.',
    tag: 'Penetrante',
  },
  {
    id: 'boxing_bell',
    name: 'Gongo / Sino Metálico',
    description: 'Tiro forte: duplo toque enérgico de ringue. Trote leve: sino grave ressonante de transição.',
    tag: 'Clássico Ringue',
  },
  {
    id: 'classic',
    name: 'Bip Tradicional de Cronômetro',
    description: 'Tiro forte: bip acelerado ascendente. Trote leve: bip simples suave de cronômetro esportivo.',
    tag: 'Padrão',
  },
];
