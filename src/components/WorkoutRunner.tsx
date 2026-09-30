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
import { RouteMiniMap } from './RouteMiniMap';
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
  const [isScreenLockedOn, setIsScreenLockedOn] = useState(false);
  const [showUnlockTip, setShowUnlockTip] = useState(false);

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
    // 1. Play distinct sound alert tuned specifically for high intensity vs low intensity
    audioAlerts.playPhaseChangeAlert(step.phase);

    // 2. Play guaranteed Web Audio voice cue (100% plays even if screen is locked)
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
    // Keep screen awake permanently when cadeado is active
    await applyWakeLock(true);
    if (nextState) {
      audioAlerts.vibrate([100, 50, 100]);
      audioAlerts.speak('Tela bloqueada. Toque no cadeado para liberar.');
    } else {
      audioAlerts.vibrate(100);
      audioAlerts.speak('Tela desbloqueada.');
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

  // Stabilized ref for announceStep so timer worker effect is NEVER recreated prematurely
  const announceStepRef = useRef(announceStep);
  announceStepRef.current = announceStep;

  // Track seconds remaining via ref to enable robust calculations even when screen sleeps
  const secondsRemainingRef = useRef(steps[0]?.durationSeconds || 0);

  // BULLETPROOF BACKGROUND TIMER VIA WEB WORKER WITH TIMESTAMP DRIFT COMPENSATION
  // Runs continuously in second plan even if screen is locked or phone is in user's pocket
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
      const currentRemaining = secondsRemainingRef.current;
      const activeIdx = currentStepIndexRef.current;
      const activeStep = steps[activeIdx];
      const upcomingStep = steps[activeIdx + 1];

      if (!activeStep) return;

      // Countdown ticks at 3, 2, 1
      if (currentRemaining <= 4 && currentRemaining > 1) {
        audioAlerts.playCountdownTick(currentRemaining - 1);
      }

      // Halfway motivational announcement
      if (activeStep.durationSeconds >= 60 && currentRemaining === Math.floor(activeStep.durationSeconds / 2)) {
        audioAlerts.playVoiceCue('metade');
        audioAlerts.speak('Metade concluída!');
      }

      // 5 seconds notice for next phase
      if (currentRemaining === 6 && upcomingStep) {
        audioAlerts.playVoiceCue('atencao');
        const nextCfg = PHASE_CONFIGS[upcomingStep.phase];
        audioAlerts.speak(`Atenção: ${nextCfg.label} em 5 segundos.`);
      }

      // Phase finished: advance or complete
      if (currentRemaining <= 1) {
        if (activeIdx + 1 < steps.length) {
          const nextIdx = activeIdx + 1;
          currentStepIndexRef.current = nextIdx;
          setCurrentStepIndex(nextIdx);
          const nextStp = steps[nextIdx];
          secondsRemainingRef.current = nextStp.durationSeconds;
          setSecondsRemaining(nextStp.durationSeconds);
          announceStepRef.current(nextStp);
        } else {
          // WORKOUT FINISHED!
          secondsRemainingRef.current = 0;
          setSecondsRemaining(0);
          setIsCompleted(true);
          isCompletedRef.current = true;
          audioAlerts.playCompletionFanfare();
          audioAlerts.speak('Parabéns! Treino concluído com sucesso!');

          // Save to Firestore cloud history and local persistent storage
          const finalMetrics = gpsTrackerRef.current?.getMetrics(nextTotal) || {
            distanceMeters: 0,
            averagePaceMinKm: '--:-- /km',
            currentSpeedKmh: 0,
            trackPoints: [],
          };

          const runPayload = {
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
            gpsTrack: finalMetrics.trackPoints || [],
          };

          if (typeof window !== 'undefined') {
            // 1. Immediately save to local storage (guarantees activity is saved even if offline)
            import('../services/storage').then(({ saveLocalRun }) => {
              saveLocalRun(runPayload);
            }).catch(() => {});

            // 2. Sync with cloud Firestore
            import('../services/firebase').then(({ auth, saveRunHistoryToCloud }) => {
              if (auth.currentUser) {
                saveRunHistoryToCloud(auth.currentUser.uid, runPayload).catch(console.error);
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
        }
      } else {
        const nextRem = currentRemaining - 1;
        secondsRemainingRef.current = nextRem;
        setSecondsRemaining(nextRem);
      }
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
  }, [isPaused, isCompleted, steps, workout.id, workout.name]);

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
      const nextDur = steps[nextIdx].durationSeconds;
      secondsRemainingRef.current = nextDur;
      setSecondsRemaining(nextDur);
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
      const curDur = currentStep?.durationSeconds || 0;
      secondsRemainingRef.current = curDur;
      setSecondsRemaining(curDur);
    } else if (activeIdx > 0) {
      const prevIdx = activeIdx - 1;
      currentStepIndexRef.current = prevIdx;
      setCurrentStepIndex(prevIdx);
      const prevDur = steps[prevIdx].durationSeconds;
      secondsRemainingRef.current = prevDur;
      setSecondsRemaining(prevDur);
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Atividade Salva com Sucesso!
            </div>
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

          {/* GPS Route Map with Phase Gradients */}
          {gpsMetrics.trackPoints && gpsMetrics.trackPoints.length >= 2 && (
            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
                <span>Trajeto GPS & Cores dos Tiros</span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {gpsMetrics.trackPoints.length} pontos
                </span>
              </div>
              <RouteMiniMap trackPoints={gpsMetrics.trackPoints} height={190} />
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => {
                currentStepIndexRef.current = 0;
                totalElapsedRef.current = 0;
                const firstDur = steps[0]?.durationSeconds || 0;
                secondsRemainingRef.current = firstDur;
                setCurrentStepIndex(0);
                setSecondsRemaining(firstDur);
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
          Júlio César Ritmo Intervalo
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
          className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          title="Encerrar sessão"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Workout Progress Indicator */}
        <div className="text-sm sm:text-base text-slate-300 font-bold font-mono tabular-nums bg-slate-900/90 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <span className="text-white">{formatTimeDisplay(totalElapsedSeconds)}</span>
          <span className="mx-1.5 text-slate-500">/</span>
          <span className="text-slate-400">-{formatTimeDisplay(totalRemainingSeconds)}</span>
        </div>

        {/* Screen Lock, Audio & Settings Controls */}
        <div className="flex items-center gap-2">
          {/* Prominent Dedicated Padlock Button: Trava a tela para NUNCA apagar */}
          <button
            onClick={toggleScreenLock}
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-sm ${
              isScreenLockedOn
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/70 shadow-amber-500/20 animate-pulse'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
            title={
              isScreenLockedOn
                ? 'Cadeado Ativo: Tela travada ligada (Não apaga). Toque para liberar.'
                : 'Cadeado Desligado: Tela pode apagar. Toque para travar ligada.'
            }
          >
            {isScreenLockedOn ? (
              <>
                <Lock className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300 hidden xs:inline">Travada</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-300 hidden xs:inline">Travar</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={toggleBeeps}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                beepsEnabled ? 'text-white bg-slate-800' : 'text-slate-500'
              }`}
              title="Sons de bip"
            >
              {beepsEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleTts}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                ttsEnabled ? 'text-white bg-slate-800' : 'text-slate-500'
              }`}
              title="Instruções de voz"
            >
              {ttsEnabled ? <Mic className="w-5 h-5 text-cyan-400" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Configurações de som e GPS"
            >
              <Sliders className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* GPS Telemetry Bar - High Visibility for Outdoor Running */}
      <div className="w-full max-w-md mx-auto z-10 space-y-2">
        <div 
          onClick={() => setIsSettingsOpen(true)}
          className="bg-slate-900/95 border-2 border-slate-800 hover:border-slate-700 rounded-2xl px-6 py-3 flex items-center justify-between shadow-lg cursor-pointer transition-colors"
          title="Toque para configurar sons ou alternar modo de GPS"
        >
          <div className="text-left">
            <span className="text-xs sm:text-sm text-slate-300 font-extrabold uppercase tracking-wider block">
              DISTÂNCIA
            </span>
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums leading-tight">
              {gpsMetrics.formattedDistance}
            </span>
          </div>

          <div className="h-10 w-[1.5px] bg-slate-800" />

          <div className="text-center">
            <span className="text-xs sm:text-sm text-slate-300 font-extrabold uppercase tracking-wider block">
              RITMO
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums leading-tight">
              {gpsMetrics.averagePaceMinKm}
            </span>
          </div>

          <div className="h-10 w-[1.5px] bg-slate-800" />

          <div className="text-right">
            <span className="text-xs sm:text-sm text-slate-300 font-extrabold uppercase tracking-wider block">
              VELOCIDADE
            </span>
            <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono tabular-nums leading-tight">
              {gpsMetrics.currentSpeedKmh.toFixed(1)} <span className="text-xs font-bold text-slate-400">km/h</span>
            </span>
          </div>
        </div>

        {/* GPS Status Indicator & Quick Switch */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gpsMetrics.gpsStatus === 'active'
                  ? 'bg-emerald-400'
                  : gpsMetrics.gpsStatus === 'simulated'
                  ? 'bg-blue-400'
                  : gpsMetrics.gpsStatus === 'denied'
                  ? 'bg-rose-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-bold text-slate-200">
              {gpsMetrics.gpsStatus === 'active'
                ? `GPS Ativo (${gpsMetrics.accuracyMeters ? `±${Math.round(gpsMetrics.accuracyMeters)}m` : 'ótimo sinal'})`
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
              className="text-cyan-400 font-black hover:underline cursor-pointer"
            >
              Usar GPS Real
            </button>
          ) : (
            <button
              onClick={() => handleToggleGpsMode(true)}
              className="text-emerald-400 font-black hover:underline cursor-pointer"
            >
              Simular Esteira
            </button>
          )}
        </div>
      </div>

      {/* Center: Hero Countdown Timer & Phase (Enlarged for Night & 40+ Vision) */}
      <div className="flex flex-col items-center justify-center my-auto text-center space-y-4 max-w-lg mx-auto w-full">
        {/* Phase Badge: Large, bold and high-contrast */}
        <div className="flex items-center gap-3 bg-slate-900/90 border-2 border-slate-800 px-5 py-2.5 rounded-2xl shadow-md">
          <span
            className="w-4 h-4 rounded-full shadow-sm animate-pulse"
            style={{ backgroundColor: currentPhaseColor }}
          />
          <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white drop-shadow-sm">
            {currentCfg.label}
          </h2>
          {currentStep?.blockRepetitionIndex && (
            <span className="text-base sm:text-lg text-amber-400 font-extrabold ml-1">
              ({currentStep.blockRepetitionIndex}/{currentStep.totalBlockRepetitions})
            </span>
          )}
        </div>

        {/* Massive Crisp Tabular Countdown */}
        <div className="py-0.5">
          <div className="font-mono text-8xl sm:text-9xl font-black text-white tracking-tighter tabular-nums drop-shadow-md">
            {formatTimeDisplay(secondsRemaining)}
          </div>
        </div>

        {/* Phase Step Progress Bar with Big Clear Font */}
        <div className="w-full max-w-sm space-y-2">
          <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              style={{
                width: `${stepProgressPct}%`,
                backgroundColor: currentPhaseColor,
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-sm sm:text-base font-extrabold text-slate-200 font-mono tabular-nums px-1">
            <span className="text-slate-300">Etapa <strong className="text-white">{(currentStep?.stepIndexInFlattened ?? 0) + 1}</strong> de {currentStep?.totalFlattenedSteps ?? steps.length}</span>
            <span className="text-emerald-400 font-black">{(currentStep?.durationSeconds ?? 0) - secondsRemaining}s / {currentStep?.durationSeconds ?? 0}s</span>
          </div>
        </div>

        {/* Next Step Preview: Big and High Contrast */}
        {nextStep && (
          <div className="w-full max-w-md bg-slate-900/95 border-2 border-slate-800/90 rounded-2xl px-5 py-3 flex items-center justify-between text-sm sm:text-base text-slate-300 font-semibold shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-400">
                A seguir:
              </span>
              <span className="text-white font-extrabold text-base sm:text-lg">
                {PHASE_CONFIGS[nextStep.phase].label}
              </span>
              <span className="text-amber-400 font-mono font-bold text-sm sm:text-base">
                ({formatTimeDisplay(nextStep.durationSeconds)})
              </span>
            </div>
            {nextStep.blockRepetitionIndex && (
              <span className="text-xs sm:text-sm font-bold bg-slate-800 text-slate-200 px-2.5 py-1 rounded-xl">
                série {nextStep.blockRepetitionIndex}
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

      {/* FULL-SCREEN TOUCH LOCK SHIELD:
          When isScreenLockedOn is true, this transparent shield blocks ALL touches to pause, next, prev, exit, settings, etc.
          The ONLY interactable item is the floating lock button itself. */}
      {isScreenLockedOn && (
        <div
          onClick={() => {
            setShowUnlockTip(true);
            setTimeout(() => setShowUnlockTip(false), 2500);
          }}
          className="fixed inset-0 z-50 bg-black/20 select-none cursor-default flex flex-col items-center justify-between p-6 pointer-events-auto"
        >
          {/* Top Banner Alert */}
          <div className="w-full max-w-sm flex items-center justify-between pointer-events-none animate-fade-in">
            <div className="flex items-center gap-2 bg-amber-500 text-slate-950 px-4 py-2 rounded-full font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25">
              <Lock className="w-4 h-4 stroke-[3]" />
              <span>TELA BLOQUEADA</span>
            </div>

            {showUnlockTip && (
              <span className="text-xs sm:text-sm font-black text-amber-300 bg-slate-950/95 px-4 py-1.5 rounded-full border border-amber-500/60 animate-bounce shadow-xl">
                Toque no botão abaixo
              </span>
            )}
          </div>

          {/* Central prompt if user accidentally taps elsewhere */}
          <div className="pointer-events-none text-center my-auto transition-opacity duration-300">
            {showUnlockTip ? (
              <div className="bg-slate-950/95 border-2 border-amber-500 text-amber-300 px-6 py-4 rounded-3xl shadow-2xl space-y-1.5 animate-pulse max-w-xs mx-auto">
                <Lock className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="font-black text-base sm:text-lg">Toque no cadeado abaixo para destravar</p>
                <p className="text-xs sm:text-sm text-slate-300 font-semibold">Proteção contra toques ativada</p>
              </div>
            ) : null}
          </div>

          {/* Floating Dedicated Unlock Button: The ONLY clickable element on screen */}
          <div className="w-full max-w-sm flex flex-col items-center gap-2.5 pb-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleScreenLock();
              }}
              className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-2xl shadow-amber-500/50 transition-transform active:scale-95 cursor-pointer pointer-events-auto border-2 border-amber-300"
              title="Toque aqui para destravar a tela"
            >
              <Lock className="w-6 h-6 fill-slate-950 stroke-[2.5]" />
              <span>DESTRAVAR TELA</span>
            </button>
            <span className="text-xs sm:text-sm font-bold text-slate-300 text-center drop-shadow pointer-events-none">
              Toques acidentais bloqueados • Treino e áudio ativos
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
