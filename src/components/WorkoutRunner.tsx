import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Workout,
  FlattenedStep,
  PHASE_CONFIGS,
  PhaseType,
  GpsRunMetrics,
} from '../types/workout';
import { flattenWorkoutSteps, formatTimeDisplay } from '../utils/dashboardCalculator';
import { audioAlerts } from '../utils/soundAndTts';
import { screenWakeLock } from '../utils/screenWakeLock';
import { GpsTrackerEngine } from '../utils/gpsTracker';
import { AudioGpsSettingsModal } from './AudioGpsSettingsModal';
import { useTheme } from '../context/ThemeContext';
import confetti from 'canvas-confetti';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sliders,
  Trophy,
  Activity,
  Navigation,
  Lock,
  Unlock,
} from 'lucide-react';

interface WorkoutRunnerProps {
  workout: Workout;
  onFinish: () => void;
  onExit: () => void;
}

export const WorkoutRunner: React.FC<WorkoutRunnerProps> = ({
  workout,
  onFinish,
  onExit,
}) => {
  const { themeConfig } = useTheme();
  const steps: FlattenedStep[] = useRef(flattenWorkoutSteps(workout)).current;

  // State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(steps[0]?.durationSeconds || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [isScreenLockedOn, setIsScreenLockedOn] = useState(true);

  // Audio & TTS toggles
  const [beepsEnabled, setBeepsEnabled] = useState(!audioAlerts.isBeepsMuted());
  const [ttsEnabled, setTtsEnabled] = useState(!audioAlerts.isTtsMuted());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // GPS Tracking State
  const [isSimulatedGps, setIsSimulatedGps] = useState(false);
  const [gpsMetrics, setGpsMetrics] = useState<GpsRunMetrics>({
    distanceMeters: 0,
    formattedDistance: '0.00 km',
    currentSpeedKmh: 0,
    averagePaceMinKm: '--:-- /km',
    gpsStatus: 'searching',
    accuracyMeters: null,
  });

  const gpsTrackerRef = useRef<GpsTrackerEngine | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isScreenLockedOnRef = useRef(true);
  isScreenLockedOnRef.current = isScreenLockedOn;

  // Mutable refs to prevent useEffect teardown on every single second
  const currentStepIndexRef = useRef(0);
  currentStepIndexRef.current = currentStepIndex;

  const totalElapsedRef = useRef(0);
  totalElapsedRef.current = totalElapsedSeconds;

  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const isCompletedRef = useRef(isCompleted);
  isCompletedRef.current = isCompleted;

  const totalWorkoutSeconds = steps.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalRemainingSeconds = Math.max(0, totalWorkoutSeconds - totalElapsedSeconds);

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1] as FlattenedStep | undefined;
  const currentCfg = currentStep ? PHASE_CONFIGS[currentStep.phase] : PHASE_CONFIGS.rest;

  const announceStep = useCallback((step: FlattenedStep) => {
    audioAlerts.playPhaseChangeAlert();

    // 1. Play guaranteed Web Audio voice cue (100% plays even if screen is locked)
    if (step.phase === 'high_intensity') {
      audioAlerts.playVoiceCue('tiro');
    } else if (step.phase === 'low_intensity') {
      audioAlerts.playVoiceCue('trote');
    } else if (step.phase === 'walk') {
      audioAlerts.playVoiceCue('caminhada');
    } else if (step.phase === 'warmup') {
      audioAlerts.playVoiceCue('aquecimento');
    } else if (step.phase === 'rest') {
      audioAlerts.playVoiceCue('descanso');
    }

    // 2. Play spoken verbal narration
    const phaseName = PHASE_CONFIGS[step.phase]?.label || 'Próxima etapa';
    let msg = '';
    if (step.blockRepetitionIndex) {
      msg = `Série ${step.blockRepetitionIndex} de ${step.totalBlockRepetitions}. ${phaseName} por ${step.durationSeconds} segundos!`;
    } else {
      const mins = Math.floor(step.durationSeconds / 60);
      const secs = step.durationSeconds % 60;
      if (mins > 0 && secs === 0) {
        msg = `${phaseName} por ${mins} minutos.`;
      } else if (mins > 0) {
        msg = `${phaseName} por ${mins} minutos e ${secs} segundos.`;
      } else {
        msg = `${phaseName} por ${secs} segundos.`;
      }
    }
    audioAlerts.speak(msg);
  }, []);

  // Request or Release Screen WakeLock (Dual Layer: Native WakeLock API + Video Fallback)
  const applyWakeLock = useCallback(async (shouldLock: boolean) => {
    try {
      if (shouldLock) {
        await screenWakeLock.lock();
      } else {
        await screenWakeLock.unlock();
      }
    } catch {
      // Screen lock unsupported or rejected
    }
  }, []);

  const toggleScreenLock = async () => {
    const nextState = !isScreenLockedOn;
    setIsScreenLockedOn(nextState);
    await applyWakeLock(nextState);
    if (nextState) {
      audioAlerts.speak('Cadeado ativado: tela travada ligada');
    } else {
      audioAlerts.speak('Cadeado liberado: tela pode apagar');
    }
  };

  // Screen WakeLock & GPS Initialization
  useEffect(() => {
    applyWakeLock(true);

    const handleVisibilityChange = async () => {
      // Re-acquire WakeLock if screen comes back on and lock is enabled
      if (document.visibilityState === 'visible' && isScreenLockedOnRef.current) {
        applyWakeLock(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const tracker = new GpsTrackerEngine();
    gpsTrackerRef.current = tracker;
    tracker.startTracking(false);

    const unsubscribe = tracker.subscribe((metrics) => {
      setGpsMetrics(metrics);
    });

    // Announce first step & activate background keep-alive audio loop
    if (steps.length > 0) {
      announceStep(steps[0]);
    }
    audioAlerts.startBackgroundKeepAlive(`Treino: ${workout.name}`);

    // Set up lockscreen MediaSession controls (Play/Pause, Next/Prev step)
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          setIsPaused(false);
          audioAlerts.speak('Continuando');
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          setIsPaused(true);
          audioAlerts.speak('Pausado');
        });
      } catch {
        // MediaSession actions unsupported
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
      if (tracker) {
        tracker.stopTracking();
      }
      applyWakeLock(false);
      audioAlerts.stopAll();
    };
  }, [steps, announceStep, applyWakeLock, workout.name]);

  // Sync GPS simulation speed with current phase
  useEffect(() => {
    if (gpsTrackerRef.current && currentStep) {
      gpsTrackerRef.current.updateCurrentPhaseForSim(currentStep.phase);
    }
  }, [currentStep]);

  // BULLETPROOF BACKGROUND TIMER VIA WEB WORKER (FALLBACK TO INTERVAL)
  // Web Workers run in a background thread and are not suspended when phone screen is locked
  useEffect(() => {
    if (isPaused || isCompleted) return;

    let worker: Worker | null = null;
    let fallbackInterval: any = null;

    const handleTick = () => {
      if (isPausedRef.current || isCompletedRef.current) return;

      // 1. Advance total elapsed time
      const nextTotal = totalElapsedRef.current + 1;
      totalElapsedRef.current = nextTotal;
      setTotalElapsedSeconds(nextTotal);

      if (gpsTrackerRef.current) {
        const m = gpsTrackerRef.current.getMetrics(nextTotal);
        setGpsMetrics(m);
      }

      // 2. Decrement step seconds
      setSecondsRemaining((prevSec) => {
        const activeIdx = currentStepIndexRef.current;
        const activeStep = steps[activeIdx];
        const upcomingStep = steps[activeIdx + 1];

        if (!activeStep) return 0;

        // Countdown ticks at 3, 2, 1
        if (prevSec <= 4 && prevSec > 1) {
          audioAlerts.playCountdownTick(prevSec - 1);
        }

        // Halfway motivational announcement
        if (activeStep.durationSeconds >= 60 && prevSec === Math.floor(activeStep.durationSeconds / 2)) {
          audioAlerts.playVoiceCue('metade');
          audioAlerts.speak('Metade concluída!');
        }

        // 5 seconds notice for next phase
        if (prevSec === 6 && upcomingStep) {
          audioAlerts.playVoiceCue('atencao');
          const nextCfg = PHASE_CONFIGS[upcomingStep.phase];
          audioAlerts.speak(`Atenção: ${nextCfg.label} em 5 segundos.`);
        }

        // Phase finished: advance or complete
        if (prevSec <= 1) {
          if (activeIdx + 1 < steps.length) {
            const nextIdx = activeIdx + 1;
            currentStepIndexRef.current = nextIdx;
            setCurrentStepIndex(nextIdx);
            const nextStp = steps[nextIdx];
            announceStep(nextStp);
            return nextStp.durationSeconds;
          } else {
            // WORKOUT FINISHED!
            setIsCompleted(true);
            isCompletedRef.current = true;
            audioAlerts.playCompletionFanfare();
            audioAlerts.speak('Parabéns! Treino concluído com sucesso!');

            // Save to Firestore cloud history
            const finalMetrics = gpsTrackerRef.current?.getMetrics(nextTotal) || {
              distanceMeters: 0,
              averagePaceMinKm: '--:-- /km',
              currentSpeedKmh: 0,
            };

            if (typeof window !== 'undefined') {
              import('../services/firebase').then(({ auth, saveRunHistoryToCloud }) => {
                if (auth.currentUser) {
                  saveRunHistoryToCloud(auth.currentUser.uid, {
                    id: `run_${Date.now()}`,
                    workoutId: workout.id,
                    workoutName: workout.name,
                    totalElapsedSeconds: nextTotal,
                    distanceMeters: finalMetrics.distanceMeters,
                    averagePace: finalMetrics.averagePaceMinKm,
                    speedKmh: finalMetrics.currentSpeedKmh,
                    stepsCompleted: steps.length,
                    totalSteps: steps.length,
                    completedAt: Date.now(),
                  }).catch(console.error);
                }
              }).catch(() => {});
            }

            try {
              confetti({
                particleCount: 140,
                spread: 90,
                origin: { y: 0.6 },
              });
            } catch {
              // Confetti fallback
            }
            return 0;
          }
        }

        return prevSec - 1;
      });
    };

    try {
      worker = new Worker('/timer-worker.js');
      worker.onmessage = (e) => {
        if (e.data?.type === 'tick') {
          handleTick();
        }
      };
      worker.postMessage({ command: 'start', interval: 1000 });
    } catch {
      fallbackInterval = setInterval(handleTick, 1000);
    }

    return () => {
      if (worker) {
        worker.postMessage({ command: 'stop' });
        worker.terminate();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [isPaused, isCompleted, steps, workout, announceStep]);

  const togglePlayPause = () => {
    audioAlerts.unlockAudio();
    setIsPaused((p) => {
      const next = !p;
      if (next) {
        audioAlerts.speak('Pausado');
      } else {
        audioAlerts.speak('Continuando');
      }
      return next;
    });
  };

  const handleNextStep = () => {
    audioAlerts.unlockAudio();
    const activeIdx = currentStepIndexRef.current;
    if (activeIdx + 1 < steps.length) {
      const nextIdx = activeIdx + 1;
      currentStepIndexRef.current = nextIdx;
      setCurrentStepIndex(nextIdx);
      setSecondsRemaining(steps[nextIdx].durationSeconds);
      announceStep(steps[nextIdx]);
    } else {
      setIsCompleted(true);
      audioAlerts.playCompletionFanfare();
      audioAlerts.speak('Treino concluído!');
    }
  };

  const handlePreviousStep = () => {
    audioAlerts.unlockAudio();
    const activeIdx = currentStepIndexRef.current;
    if (secondsRemaining < (currentStep?.durationSeconds || 0) - 3) {
      setSecondsRemaining(currentStep?.durationSeconds || 0);
    } else if (activeIdx > 0) {
      const prevIdx = activeIdx - 1;
      currentStepIndexRef.current = prevIdx;
      setCurrentStepIndex(prevIdx);
      setSecondsRemaining(steps[prevIdx].durationSeconds);
      announceStep(steps[prevIdx]);
    }
  };

  const toggleBeeps = () => {
    const next = !beepsEnabled;
    setBeepsEnabled(next);
    audioAlerts.setBeepsMuted(!next);
  };

  const toggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    audioAlerts.setTtsMuted(!next);
  };

  const handleToggleGpsMode = (simulate: boolean) => {
    setIsSimulatedGps(simulate);
    if (gpsTrackerRef.current) {
      if (simulate) {
        gpsTrackerRef.current.startSimulatedGps();
      } else {
        gpsTrackerRef.current.startTracking(false);
      }
    }
  };

  const stepProgressPct = currentStep?.durationSeconds
    ? Math.min(100, Math.max(0, ((currentStep.durationSeconds - secondsRemaining) / currentStep.durationSeconds) * 100))
    : 0;

  const totalProgressPct = totalWorkoutSeconds
    ? Math.min(100, (totalElapsedSeconds / totalWorkoutSeconds) * 100)
    : 0;

  // Clean, high-visibility phase accent colors
  const getPhaseAccentColor = (phase: PhaseType) => {
    switch (phase) {
      case 'high_intensity':
        return '#EF4444'; // Red-500
      case 'low_intensity':
        return '#10B981'; // Emerald-500
      case 'warmup':
        return '#F59E0B'; // Amber-500
      case 'walk':
        return '#0EA5E9'; // Sky-500
      case 'rest':
        return '#94A3B8'; // Slate-400
    }
  };

  const currentPhaseColor = currentStep ? getPhaseAccentColor(currentStep.phase) : '#10B981';

  // SUMMARY SCREEN
  if (isCompleted) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white p-6 justify-between items-center text-center animate-fade-in overflow-y-auto">
        <div className="w-full flex justify-end">
          <button
            onClick={onFinish}
            className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-md w-full space-y-6 my-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>

          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest block mb-1">
              Sessão Concluída
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {workout.name}
            </h2>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-left">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Tempo Total</span>
              <span className="text-2xl font-black text-white font-mono tabular-nums">
                {formatTimeDisplay(totalElapsedSeconds)}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Distância GPS</span>
              <span className={`text-2xl font-black font-mono tabular-nums ${themeConfig.accentText}`}>
                {gpsMetrics.formattedDistance}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Ritmo Médio</span>
              <span className="text-base font-bold text-white font-mono tabular-nums">
                {gpsMetrics.averagePaceMinKm}
              </span>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block mb-0.5">Etapas Concluídas</span>
              <span className="text-base font-bold text-white font-mono tabular-nums">
                {steps.length} / {steps.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => {
                currentStepIndexRef.current = 0;
                totalElapsedRef.current = 0;
                setCurrentStepIndex(0);
                setSecondsRemaining(steps[0]?.durationSeconds || 0);
                setTotalElapsedSeconds(0);
                setIsCompleted(false);
                setIsPaused(false);
                if (gpsTrackerRef.current) gpsTrackerRef.current.startTracking(isSimulatedGps);
                if (steps.length > 0) announceStep(steps[0]);
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs transition-all cursor-pointer"
            >
              Repetir Treino
            </button>

            <button
              onClick={onFinish}
              className={`w-full py-3.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer ${themeConfig.buttonPrimary}`}
            >
              Concluir
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-600 font-medium py-2">
          RitmoInterval
        </div>
      </div>
    );
  }

  // ACTIVE RUNNING VIEW: HIGH CONTRAST ATHLETIC COCKPIT
  return (
    <div className="flex flex-col h-full bg-slate-950 text-white select-none overflow-hidden justify-between p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between z-10 gap-2">
        <button
          onClick={onExit}
          className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          title="Encerrar sessão"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Workout Progress Indicator */}
        <div className="text-xs text-slate-400 font-medium font-mono tabular-nums">
          <span className="text-white font-semibold">{formatTimeDisplay(totalElapsedSeconds)}</span>
          <span className="mx-1 text-slate-600">/</span>
          <span>-{formatTimeDisplay(totalRemainingSeconds)}</span>
        </div>

        {/* Screen Lock, Audio & Settings Controls */}
        <div className="flex items-center gap-1.5">
          {/* Prominent Dedicated Padlock Button: Trava a tela para NUNCA apagar */}
          <button
            onClick={toggleScreenLock}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
              isScreenLockedOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-500/10 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={
              isScreenLockedOn
                ? 'Cadeado Ativo: Tela travada ligada (Não apaga). Toque para liberar.'
                : 'Cadeado Desligado: Tela pode apagar. Toque para travar ligada.'
            }
          >
            {isScreenLockedOn ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 hidden xs:inline">Tela Travada</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-medium text-slate-400 hidden xs:inline">Travar Tela</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={toggleBeeps}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                beepsEnabled ? 'text-white' : 'text-slate-600'
              }`}
              title="Sons de bip"
            >
              {beepsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={toggleTts}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                ttsEnabled ? 'text-white' : 'text-slate-600'
              }`}
              title="Instruções de voz"
            >
              {ttsEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Configurações de som e GPS"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* GPS Telemetry Bar */}
      <div className="w-full max-w-sm mx-auto z-10 space-y-1.5">
        <div 
          onClick={() => setIsSettingsOpen(true)}
          className="bg-slate-900/90 border border-slate-800 rounded-2xl px-5 py-2.5 flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-700 transition-colors"
          title="Toque para configurar sons ou alternar modo de GPS"
        >
          <div className="text-left">
            <span className="text-[10px] text-slate-400 uppercase font-medium block">
              Distância
            </span>
            <span className="text-lg font-black text-white font-mono tabular-nums">
              {gpsMetrics.formattedDistance}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-slate-800" />

          <div className="text-center">
            <span className="text-[10px] text-slate-400 uppercase font-medium block">
              Ritmo
            </span>
            <span className="text-sm font-bold text-slate-200 font-mono tabular-nums">
              {gpsMetrics.averagePaceMinKm}
            </span>
          </div>

          <div className="h-6 w-[1px] bg-slate-800" />

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-medium block">
              Velocidade
            </span>
            <span className="text-sm font-bold text-slate-200 font-mono tabular-nums">
              {gpsMetrics.currentSpeedKmh.toFixed(1)} km/h
            </span>
          </div>
        </div>

        {/* GPS Status Indicator & Quick Switch */}
        <div className="flex items-center justify-between px-3 py-1 bg-slate-900/80 border border-slate-800/80 rounded-xl text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsMetrics.gpsStatus === 'active'
                  ? 'bg-emerald-400'
                  : gpsMetrics.gpsStatus === 'simulated'
                  ? 'bg-blue-400'
                  : gpsMetrics.gpsStatus === 'denied'
                  ? 'bg-rose-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-medium text-slate-300">
              {gpsMetrics.gpsStatus === 'active'
                ? `GPS Conectado (${gpsMetrics.accuracyMeters ? `±${Math.round(gpsMetrics.accuracyMeters)}m` : 'ativo'})`
                : gpsMetrics.gpsStatus === 'simulated'
                ? 'Modo Esteira / Virtual'
                : gpsMetrics.gpsStatus === 'denied'
                ? 'GPS Bloqueado no Navegador'
                : 'Buscando satélites...'}
            </span>
          </div>

          {isSimulatedGps ? (
            <button
              onClick={() => handleToggleGpsMode(false)}
              className="text-cyan-400 font-bold hover:underline cursor-pointer"
            >
              Usar GPS Real
            </button>
          ) : (
            <button
              onClick={() => handleToggleGpsMode(true)}
              className="text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              Simular Esteira
            </button>
          )}
        </div>
      </div>

      {/* Center: Hero Countdown Timer & Phase */}
      <div className="flex flex-col items-center justify-center my-auto text-center space-y-4 max-w-lg mx-auto w-full">
        {/* Phase Badge */}
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentPhaseColor }}
          />
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
            {currentCfg.label}
          </h2>
          {currentStep?.blockRepetitionIndex && (
            <span className="text-xs text-slate-400 font-semibold ml-1">
              ({currentStep.blockRepetitionIndex}/{currentStep.totalBlockRepetitions})
            </span>
          )}
        </div>

        {/* Massive Crisp Tabular Countdown */}
        <div className="py-1">
          <div className="font-mono text-8xl sm:text-9xl font-black text-white tracking-tighter tabular-nums">
            {formatTimeDisplay(secondsRemaining)}
          </div>
        </div>

        {/* Phase Step Progress Bar */}
        <div className="w-full max-w-xs space-y-1.5">
          <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              style={{
                width: `${stepProgressPct}%`,
                backgroundColor: currentPhaseColor,
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-mono tabular-nums">
            <span>Etapa {(currentStep?.stepIndexInFlattened ?? 0) + 1} de {currentStep?.totalFlattenedSteps ?? steps.length}</span>
            <span>{(currentStep?.durationSeconds ?? 0) - secondsRemaining}s / {currentStep?.durationSeconds ?? 0}s</span>
          </div>
        </div>

        {/* Next Step Preview */}
        {nextStep && (
          <div className="text-xs text-slate-400 flex items-center gap-2 pt-1 font-medium">
            <span>A seguir:</span>
            <span className="text-white font-semibold">
              {PHASE_CONFIGS[nextStep.phase].label} ({formatTimeDisplay(nextStep.durationSeconds)})
            </span>
            {nextStep.blockRepetitionIndex && (
              <span className="text-slate-500">
                · repetição {nextStep.blockRepetitionIndex}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md mx-auto z-10 pb-4">
        {/* Total Progress Track */}
        <div className="mb-5 space-y-1">
          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
            <div
              style={{ width: `${totalProgressPct}%` }}
              className={`h-full ${themeConfig.accentBg} rounded-full transition-all duration-300`}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-6 sm:gap-8">
          <button
            onClick={handlePreviousStep}
            className="w-14 h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Voltar etapa"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          <button
            onClick={togglePlayPause}
            className="w-20 h-20 rounded-3xl bg-white hover:bg-slate-100 text-slate-950 flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer"
            title={isPaused ? 'Continuar' : 'Pausar'}
          >
            {isPaused ? (
              <Play className="w-8 h-8 fill-current translate-x-0.5" />
            ) : (
              <Pause className="w-8 h-8 fill-current" />
            )}
          </button>

          <button
            onClick={handleNextStep}
            className="w-14 h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="Avançar etapa"
          >
            <SkipForward className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AudioGpsSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        gpsStatus={gpsMetrics.gpsStatus}
        isSimulatedGps={isSimulatedGps}
        onToggleGpsMode={handleToggleGpsMode}
      />
    </div>
  );
};
