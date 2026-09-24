import React, { useState, useEffect, useRef } from 'react';
import {
  Workout,
  FlattenedStep,
  PHASE_CONFIGS,
  PhaseType,
  GpsRunMetrics,
} from '../types/workout';
import { flattenWorkoutSteps, formatTimeDisplay } from '../utils/dashboardCalculator';
import { audioAlerts, SOUND_PROFILES } from '../utils/soundAndTts';
import { GpsTrackerEngine } from '../utils/gpsTracker';
import { AudioGpsSettingsModal } from './AudioGpsSettingsModal';
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
  Flame,
  Zap,
  Activity,
  Footprints,
  Coffee,
  Trophy,
  CheckCircle,
  RotateCcw,
  Clock,
  Sparkles,
  Navigation,
  Sliders,
  Gauge,
  MapPin,
  TrendingUp,
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
  const steps: FlattenedStep[] = useRef(flattenWorkoutSteps(workout)).current;

  // Running State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    steps[0]?.durationSeconds || 0
  );
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);

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

  // Total workout duration in seconds
  const totalWorkoutSeconds = steps.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalRemainingSeconds = Math.max(0, totalWorkoutSeconds - totalElapsedSeconds);

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1] as FlattenedStep | undefined;
  const currentCfg = currentStep ? PHASE_CONFIGS[currentStep.phase] : PHASE_CONFIGS.rest;

  // Screen WakeLock & GPS Initialization
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // WakeLock unsupported or rejected
      }
    }
    requestWakeLock();

    // Start GPS Engine
    const tracker = new GpsTrackerEngine();
    gpsTrackerRef.current = tracker;
    tracker.startTracking(false);

    const unsubscribe = tracker.subscribe((metrics) => {
      setGpsMetrics(metrics);
    });

    return () => {
      unsubscribe();
      if (tracker) {
        tracker.stopTracking();
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      audioAlerts.stopAll();
    };
  }, []);

  // Update GPS simulation speed when current step changes
  useEffect(() => {
    if (gpsTrackerRef.current && currentStep) {
      gpsTrackerRef.current.updateCurrentPhaseForSim(currentStep.phase);
    }
  }, [currentStep]);

  // Announce step start with TTS and tone
  const announceStep = (step: FlattenedStep) => {
    audioAlerts.playPhaseChangeAlert();
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
  };

  // Initial announcement on component mount
  useEffect(() => {
    if (steps.length > 0) {
      announceStep(steps[0]);
    }
  }, []);

  // Main countdown timer ticker
  useEffect(() => {
    if (isPaused || isCompleted || !currentStep) return;

    const interval = setInterval(() => {
      setTotalElapsedSeconds((prev) => {
        const nextTotal = prev + 1;
        // Also update GPS metrics calculation with current elapsed seconds
        if (gpsTrackerRef.current) {
          const m = gpsTrackerRef.current.getMetrics(nextTotal);
          setGpsMetrics(m);
        }
        return nextTotal;
      });

      setSecondsRemaining((prevSec) => {
        // Countdown beeps at 3, 2, 1
        if (prevSec <= 4 && prevSec > 1) {
          audioAlerts.playCountdownTick(prevSec - 1);
        }

        // Halfway motivational prompt
        if (currentStep.durationSeconds > 60 && prevSec === Math.floor(currentStep.durationSeconds / 2)) {
          audioAlerts.speak('Metade da etapa concluída! Mantenha o ritmo!');
        }

        // 5 seconds upcoming warning
        if (prevSec === 6 && nextStep) {
          const nextCfg = PHASE_CONFIGS[nextStep.phase];
          audioAlerts.speak(`Atenção: ${nextCfg.label} em 5 segundos.`);
        }

        if (prevSec <= 1) {
          // Advance to next step or complete
          if (currentStepIndex + 1 < steps.length) {
            const nextIdx = currentStepIndex + 1;
            const nextStp = steps[nextIdx];
            setCurrentStepIndex(nextIdx);
            announceStep(nextStp);
            return nextStp.durationSeconds;
          } else {
            // FINISHED!
            setIsCompleted(true);
            audioAlerts.playCompletionFanfare();
            audioAlerts.speak('Parabéns! Treino intervalado finalizado com sucesso!');

            // Save run to individual user's database in Firestore
            if (typeof window !== 'undefined') {
              import('../services/firebase').then(({ auth, saveRunHistoryToCloud }) => {
                if (auth.currentUser) {
                  saveRunHistoryToCloud(auth.currentUser.uid, {
                    id: `run_${Date.now()}`,
                    workoutId: workout.id,
                    workoutName: workout.name,
                    totalElapsedSeconds: prevSec <= 1 ? totalElapsedSeconds + 1 : totalElapsedSeconds,
                    distanceMeters: gpsMetrics.distanceMeters,
                    averagePace: gpsMetrics.averagePaceMinKm,
                    speedKmh: gpsMetrics.currentSpeedKmh,
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
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isCompleted, currentStepIndex, steps, currentStep, nextStep]);

  // Controls
  const togglePlayPause = () => {
    audioAlerts.unlockAudio();
    setIsPaused((p) => {
      const next = !p;
      if (next) {
        audioAlerts.speak('Treino pausado');
      } else {
        audioAlerts.speak('Continuando');
      }
      return next;
    });
  };

  const handleNextStep = () => {
    audioAlerts.unlockAudio();
    if (currentStepIndex + 1 < steps.length) {
      const nextIdx = currentStepIndex + 1;
      const nextStp = steps[nextIdx];
      setCurrentStepIndex(nextIdx);
      setSecondsRemaining(nextStp.durationSeconds);
      announceStep(nextStp);
    } else {
      setIsCompleted(true);
      audioAlerts.playCompletionFanfare();
      audioAlerts.speak('Treino concluído!');
    }
  };

  const handlePreviousStep = () => {
    audioAlerts.unlockAudio();
    if (secondsRemaining < (currentStep?.durationSeconds || 0) - 3) {
      setSecondsRemaining(currentStep?.durationSeconds || 0);
    } else if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      const prevStp = steps[prevIdx];
      setCurrentStepIndex(prevIdx);
      setSecondsRemaining(prevStp.durationSeconds);
      announceStep(prevStp);
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

  // Helper to render icon for phase
  const getPhaseIcon = (phase: PhaseType, size = 'w-6 h-6') => {
    switch (phase) {
      case 'warmup':
        return <Flame className={size} />;
      case 'high_intensity':
        return <Zap className={size} />;
      case 'low_intensity':
        return <Activity className={size} />;
      case 'walk':
        return <Footprints className={size} />;
      case 'rest':
        return <Coffee className={size} />;
    }
  };

  // Background color dynamically maps to current phase
  const getPhaseThemeClass = (phase: PhaseType) => {
    switch (phase) {
      case 'high_intensity':
        return 'from-rose-600 via-red-700 to-rose-950'; // Red
      case 'low_intensity':
        return 'from-emerald-600 via-green-700 to-emerald-950'; // Green
      case 'warmup':
        return 'from-amber-500 via-amber-600 to-amber-950'; // Amber/Orange
      case 'walk':
        return 'from-sky-600 via-blue-700 to-blue-950'; // Cyan/Blue
      case 'rest':
        return 'from-slate-700 via-slate-800 to-slate-950'; // Dark Slate
    }
  };

  const stepProgressPct = currentStep?.durationSeconds
    ? Math.min(100, Math.max(0, ((currentStep.durationSeconds - secondsRemaining) / currentStep.durationSeconds) * 100))
    : 0;

  const totalProgressPct = totalWorkoutSeconds
    ? Math.min(100, (totalElapsedSeconds / totalWorkoutSeconds) * 100)
    : 0;

  // Active sound profile name
  const currentSoundProfile = SOUND_PROFILES.find((p) => p.id === audioAlerts.getSoundProfile()) || SOUND_PROFILES[0];

  // COMPLETED SCREEN
  if (isCompleted) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-white p-5 sm:p-6 justify-between items-center text-center animate-fade-in overflow-y-auto">
        <div className="w-full flex justify-end">
          <button
            onClick={onFinish}
            className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="max-w-md w-full space-y-5 my-auto">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 p-1 flex items-center justify-center shadow-2xl shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4" /> Treino Concluído!
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sensacional!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Você completou com sucesso o treino <strong className="text-white">"{workout.name}"</strong>.
            </p>
          </div>

          {/* Stats Summary Card with GPS Distance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
            <div className="text-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Tempo Total
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {formatTimeDisplay(totalElapsedSeconds)}
              </span>
            </div>

            <div className="text-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Distância GPS
              </span>
              <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                {gpsMetrics.formattedDistance}
              </span>
            </div>

            <div className="text-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Ritmo Médio
              </span>
              <span className="text-base sm:text-lg font-bold text-amber-300 font-mono">
                {gpsMetrics.averagePaceMinKm}
              </span>
            </div>

            <div className="text-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                Etapas Realizadas
              </span>
              <span className="text-base sm:text-lg font-bold text-blue-400 font-mono">
                {steps.length} / {steps.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            <button
              onClick={() => {
                setCurrentStepIndex(0);
                setSecondsRemaining(steps[0]?.durationSeconds || 0);
                setTotalElapsedSeconds(0);
                setIsCompleted(false);
                setIsPaused(false);
                if (gpsTrackerRef.current) gpsTrackerRef.current.startTracking(isSimulatedGps);
                if (steps.length > 0) announceStep(steps[0]);
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetir este Treino</span>
            </button>

            <button
              onClick={onFinish}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Voltar aos Meus Treinos</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-600 font-medium py-2">
          RitmoInterval • Execução Nativa com GPS & Som Turbo
        </div>
      </div>
    );
  }

  // ACTIVE RUNNING SCREEN WITH DYNAMIC PHASE BACKGROUND & GPS HUD
  return (
    <div
      className={`flex flex-col h-full bg-gradient-to-b ${getPhaseThemeClass(
        currentStep.phase
      )} text-white transition-colors duration-700 ease-in-out select-none overflow-hidden justify-between p-3.5 sm:p-5`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10 gap-2">
        <button
          onClick={onExit}
          className="p-2 rounded-xl bg-black/25 hover:bg-black/40 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
          title="Sair do treino"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Global Workout Progress Pill */}
        <div className="px-3 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-xs font-bold tracking-wide">
          <Clock className="w-3.5 h-3.5 text-white/80" />
          <span>{formatTimeDisplay(totalElapsedSeconds)}</span>
          <span className="text-white/40">/</span>
          <span className="text-white/70">-{formatTimeDisplay(totalRemainingSeconds)}</span>
        </div>

        {/* Audio / Voice / GPS Settings Button */}
        <div className="flex items-center gap-1 bg-black/25 backdrop-blur-md rounded-xl p-1 border border-white/10">
          <button
            onClick={toggleBeeps}
            className={`p-1.5 rounded-lg transition-all ${
              beepsEnabled ? 'text-white bg-white/20' : 'text-white/40 hover:text-white/70'
            }`}
            title={beepsEnabled ? `Bip ativo (${currentSoundProfile.name})` : 'Bips mudos'}
          >
            {beepsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleTts}
            className={`p-1.5 rounded-lg transition-all ${
              ttsEnabled ? 'text-white bg-white/20' : 'text-white/40 hover:text-white/70'
            }`}
            title={ttsEnabled ? 'Voz Text-to-Speech ativada' : 'Voz desativada'}
          >
            {ttsEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-all"
            title="Configurar sons altos e GPS"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GPS LIVE DASHBOARD HUD */}
      <div className="w-full max-w-sm mx-auto z-10 px-1 pt-1">
        <div className="bg-black/30 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 flex items-center justify-between shadow-lg">
          {/* Distance */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-white/70 tracking-wider">
                Distância GPS
              </div>
              <div className="text-base font-black text-cyan-200 font-mono leading-none">
                {gpsMetrics.formattedDistance}
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/15" />

          {/* Pace */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-white/70 tracking-wider">
                Ritmo Médio
              </div>
              <div className="text-xs sm:text-sm font-black text-emerald-200 font-mono leading-none">
                {gpsMetrics.averagePaceMinKm}
              </div>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-white/15 hidden sm:block" />

          {/* Speed */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-white/70 tracking-wider">
                Velocidade
              </div>
              <div className="text-xs font-black text-amber-200 font-mono leading-none">
                {gpsMetrics.currentSpeedKmh} km/h
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Body: Massive Countdown & Step Header */}
      <div className="flex flex-col items-center justify-center my-auto text-center space-y-3.5 max-w-lg mx-auto w-full">
        {/* Step Index & Repetition Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-3 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/20 text-xs font-extrabold uppercase tracking-wider text-white">
            Etapa {currentStep.stepIndexInFlattened + 1} de {currentStep.totalFlattenedSteps}
          </span>

          {currentStep.blockRepetitionIndex && (
            <span className="px-3 py-1 rounded-full bg-white/25 backdrop-blur-md border border-white/30 text-xs font-black uppercase tracking-wider text-white shadow-sm">
              SÉRIE {currentStep.blockRepetitionIndex} / {currentStep.totalBlockRepetitions}
            </span>
          )}
        </div>

        {/* Phase Name & Icon */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="p-2 rounded-2xl bg-white/20 backdrop-blur-md shadow-lg">
            {getPhaseIcon(currentStep.phase, 'w-6 h-6 sm:w-8 sm:h-8')}
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight drop-shadow-md">
            {currentCfg.label}
          </h2>
        </div>

        {/* GIGANTIC COUNTDOWN TIMER */}
        <div className="relative py-2 flex items-center justify-center">
          <div className="font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter drop-shadow-2xl text-white select-none">
            {formatTimeDisplay(secondsRemaining)}
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full max-w-xs sm:max-w-sm space-y-1">
          <div className="h-2.5 w-full bg-black/30 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              style={{ width: `${stepProgressPct}%` }}
              className="h-full bg-white rounded-full transition-all duration-300 shadow-md"
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-white/70 px-1">
            <span>Decorrido: {currentStep.durationSeconds - secondsRemaining}s</span>
            <span>Total: {currentStep.durationSeconds}s</span>
          </div>
        </div>

        {/* Next Step Preview Card */}
        {nextStep && (
          <div className="mt-2 px-3.5 py-2 rounded-2xl bg-black/30 backdrop-blur-md border border-white/15 flex items-center justify-between w-full max-w-xs sm:max-w-sm">
            <div className="flex items-center gap-2 text-left">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
                A Seguir:
              </span>
              <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                {getPhaseIcon(nextStep.phase, 'w-3.5 h-3.5')}
                <span>{PHASE_CONFIGS[nextStep.phase].label}</span>
                {nextStep.blockRepetitionIndex && (
                  <span className="text-[10px] text-white/70">
                    ({nextStep.blockRepetitionIndex}/{nextStep.totalBlockRepetitions})
                  </span>
                )}
              </div>
            </div>
            <span className="font-mono text-xs font-extrabold text-white/90">
              {formatTimeDisplay(nextStep.durationSeconds)}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md mx-auto z-10 pb-3">
        {/* Overall Workout Progress */}
        <div className="mb-3 space-y-1">
          <div className="h-1.5 w-full bg-black/25 rounded-full overflow-hidden">
            <div
              style={{ width: `${totalProgressPct}%` }}
              className="h-full bg-white/80 rounded-full transition-all duration-300"
            />
          </div>
          <div className="flex justify-between text-[10px] font-medium text-white/60">
            <span>Progresso Geral</span>
            <span>{totalProgressPct.toFixed(0)}% concluído</span>
          </div>
        </div>

        {/* Action Buttons: Prev, Play/Pause, Next */}
        <div className="flex items-center justify-center gap-6 sm:gap-8">
          {/* Previous Step */}
          <button
            onClick={handlePreviousStep}
            className="p-3.5 rounded-2xl bg-black/30 hover:bg-black/50 text-white border border-white/15 backdrop-blur-md transition-all active:scale-90"
            title="Voltar etapa / Reiniciar etapa"
          >
            <SkipBack className="w-6 h-6" />
          </button>

          {/* Big Play / Pause Button */}
          <button
            onClick={togglePlayPause}
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-white text-slate-950 font-black shadow-2xl shadow-black/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title={isPaused ? 'Continuar corrida' : 'Pausar corrida'}
          >
            {isPaused ? (
              <Play className="w-10 h-10 fill-current translate-x-0.5 text-slate-900" />
            ) : (
              <Pause className="w-10 h-10 fill-current text-slate-900" />
            )}
          </button>

          {/* Next Step */}
          <button
            onClick={handleNextStep}
            className="p-3.5 rounded-2xl bg-black/30 hover:bg-black/50 text-white border border-white/15 backdrop-blur-md transition-all active:scale-90"
            title="Pular para próxima etapa"
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
