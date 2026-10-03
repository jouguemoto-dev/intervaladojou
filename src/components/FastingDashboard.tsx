import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  FastingProfile,
  FastingSession,
  FASTING_STAGES,
  FastingStage,
} from '../types/fasting';
import {
  loadLocalFastingProfile,
  loadLocalFastingHistory,
  startFastSession,
  completeActiveFast,
  cancelActiveFast,
  CompleteFastResult,
  loadCloudFastingHistory,
  recordLiveMilestonePassed,
} from '../services/fastingService';
import { FastingRewardModal } from './FastingRewardModal';
import { formatTimeDisplay } from '../utils/dashboardCalculator';
import { useTheme } from '../context/ThemeContext';
import { audioAlerts } from '../utils/soundAndTts';
import {
  Flame,
  Zap,
  Clock,
  Trophy,
  Award,
  Lock,
  Unlock,
  CheckCircle2,
  Play,
  Square,
  Sparkles,
  Info,
  Calendar,
  ChevronRight,
  TrendingUp,
  History,
  Droplet,
  Coffee,
  Heart,
  Moon,
  Sun,
  ShieldAlert,
  Bell,
  Volume2,
} from 'lucide-react';

export const FastingDashboard: React.FC = () => {
  const { themeConfig } = useTheme();

  // Profile & History State
  const [profile, setProfile] = useState<FastingProfile>(() => loadLocalFastingProfile());
  const [history, setHistory] = useState<FastingSession[]>(() => loadLocalFastingHistory());
  const [selectedStageLevel, setSelectedStageLevel] = useState<number>(() => {
    const p = loadLocalFastingProfile();
    return p.activeFast ? p.activeFast.stageLevel : Math.min(p.unlockedLevel, FASTING_STAGES.length);
  });

  // Active Fast Live Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isAdjustStartTimeOpen, setIsAdjustStartTimeOpen] = useState(false);
  const [adjustedHoursAgo, setAdjustedHoursAgo] = useState('0');

  // Alarm & Voice Notification State
  const hasAlarmTriggeredRef = useRef(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);

  // Reward Modal State
  const [rewardResult, setRewardResult] = useState<CompleteFastResult | null>(null);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  // Live Milestone Unlocked Celebration State
  const [activeMilestoneCelebration, setActiveMilestoneCelebration] = useState<{
    stage: FastingStage;
    xpEarned: number;
    newLevelUnlocked?: number;
    newBadgeEarned?: string;
  } | null>(null);

  // Tab switch within fasting (Cockpit vs Escalada vs Histórico)
  const [activeSubTab, setActiveSubTab] = useState<'tracker' | 'stages' | 'history' | 'tips'>('tracker');

  // Load cloud history if available on mount
  useEffect(() => {
    loadCloudFastingHistory().then((sessions) => {
      if (sessions && sessions.length > 0) {
        setHistory(sessions);
      }
    });
  }, []);

  // Live timer tick for active fast, milestone awards, and target alarm
  useEffect(() => {
    if (!profile.activeFast) {
      setElapsedSeconds(0);
      hasAlarmTriggeredRef.current = false;
      setIsAlarmRinging(false);
      return;
    }

    const targetSec = profile.activeFast.targetHours * 3600;

    const updateTimer = () => {
      if (!profile.activeFast) return;
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - profile.activeFast.startTime) / 1000));
      setElapsedSeconds(elapsed);

      // LIVE MILESTONE AWARDS: Check if elapsed hours reached 2h, 4h, 6h, 8h, 10h, 12h, 14h, 16h, 18h, 20h, 22h, 24h
      const elapsedHoursFloat = elapsed / 3600;
      const awarded = profile.activeFast.awardedMilestones || [];

      for (const stg of FASTING_STAGES) {
        if (elapsedHoursFloat >= stg.targetHours && !awarded.includes(stg.targetHours)) {
          const res = recordLiveMilestonePassed(stg.targetHours);
          if (res) {
            setProfile(res.profile);
            setActiveMilestoneCelebration({
              stage: res.stage,
              xpEarned: res.xpEarned,
              newLevelUnlocked: res.newLevelUnlocked,
              newBadgeEarned: res.newBadgeEarned,
            });
            try {
              confetti({ particleCount: 110, spread: 75, origin: { y: 0.6 } });
              audioAlerts.playCompletionFanfare();
              audioAlerts.speak(res.stage.voiceCue);
            } catch {
              // Ignore audio errors
            }
          }
          break;
        }
      }

      // AUTOMATIC LOUD ALARM & VOICE when the target duration is reached!
      if (elapsed >= targetSec && !hasAlarmTriggeredRef.current) {
        hasAlarmTriggeredRef.current = true;
        setIsAlarmRinging(true);

        // 1. Play ringing celebratory chimes and Portuguese voice cue
        audioAlerts.playFastingCompletionAlarm(profile.activeFast.targetHours);

        // 2. Trigger Web Browser Push Notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('🎉 Meta de Jejum Concluída!', {
              body: `Parabéns! Você atingiu sua meta de ${profile.activeFast.targetHours} horas de jejum. Toque para coletar sua recompensa e avançar de estágio!`,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
            });
          } catch (e) {
            console.error('Notification error', e);
          }
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [profile.activeFast]);

  // Handle Start Fast
  const handleStartFast = (customStartTime?: number) => {
    // Request notification permission if not yet decided
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch {
        // Ignore
      }
    }
    const updated = startFastSession(selectedStageLevel, customStartTime);
    setProfile(updated);
    setIsAdjustStartTimeOpen(false);
  };

  // Test Alarm and Voice function for user verification
  const handleTestAlarm = () => {
    audioAlerts.playFastingCompletionAlarm(currentStage.targetHours);
  };

  // Handle Complete Fast
  const handleCompleteFast = () => {
    const res = completeActiveFast();
    if (res) {
      setProfile(res.updatedProfile);
      setHistory((prev) => [res.session, ...prev]);
      setRewardResult(res);
      setIsRewardModalOpen(true);
      // Select the new stage if unlocked
      if (res.unlockedNewLevel && res.newLevelUnlocked) {
        setSelectedStageLevel(res.newLevelUnlocked);
      }
    }
  };

  // Handle Cancel Fast
  const handleCancelFast = () => {
    if (window.confirm('Tem certeza de que deseja cancelar o jejum atual sem registrar?')) {
      const updated = cancelActiveFast();
      setProfile(updated);
    }
  };

  // Fasting calculations
  const activeFast = profile.activeFast;
  const currentStage = FASTING_STAGES.find((s) => s.level === (activeFast ? activeFast.stageLevel : selectedStageLevel)) || FASTING_STAGES[0];
  const targetSeconds = (activeFast ? activeFast.targetHours : currentStage.targetHours) * 3600;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const progressPct = Math.min(100, Math.max(0, (elapsedSeconds / targetSeconds) * 100));

  // Format hours and minutes helper
  const formatHourMin = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Current Metabolic Phase message based on elapsed hours with exact user biological roadmap
  const elapsedHours = elapsedSeconds / 3600;
  const getMetabolicStatus = (hours: number) => {
    if (hours < 2) {
      return {
        category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
        title: 'Fase Alimentada e Início da Digestão',
        desc: 'O corpo absorve os nutrientes da refeição mais recente, elevando temporariamente o açúcar no sangue e a insulina.',
        color: '#06B6D4',
      };
    } else if (hours < 4) {
      return {
        category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
        title: '2 horas: Fase anabólica ativa',
        desc: 'O corpo está na fase anabólica ativa. Ele absorve os nutrientes da refeição mais recente, elevando temporariamente o açúcar no sangue e a insulina.',
        color: '#06B6D4',
      };
    } else if (hours < 6) {
      return {
        category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
        title: '4 horas: Fim da digestão principal',
        desc: 'O processo de digestão principal termina na maioria das pessoas. Os níveis de glicose no sangue começam a se estabilizar.',
        color: '#0EA5E9',
      };
    } else if (hours < 8) {
      return {
        category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
        title: '6 horas: Queda de insulina e descanso do pâncreas',
        desc: 'A insulina começa a cair gradualmente. O pâncreas ganha um descanso da produção constante deste hormônio.',
        color: '#3B82F6',
      };
    } else if (hours < 10) {
      return {
        category: 'De 8 a 12 horas: A virada metabólica',
        title: '8 horas: Liberação de glicogênio hepático',
        desc: 'O fígado começa a liberar o glicogênio estocado para manter a energia circulante.',
        color: '#6366F1',
      };
    } else if (hours < 12) {
      return {
        category: 'De 8 a 12 horas: A virada metabólica',
        title: '10 horas: Sinal de troca da fonte de energia',
        desc: 'Os níveis de insulina reduzem-se drasticamente, enviando um sinal químico para que o corpo mude a sua fonte principal de energia.',
        color: '#8B5CF6',
      };
    } else if (hours < 14) {
      return {
        category: 'De 8 a 12 horas: A virada metabólica',
        title: '12 horas: Estado de jejum real e mobilização de gordura',
        desc: 'Inicia-se o estado de jejum real. Os estoques de glicogênio hepático começam a se esgotar, dando o "sinal verde" inicial para a mobilização de gordura.',
        color: '#10B981',
      };
    } else if (hours < 16) {
      return {
        category: 'De 14 a 18 horas: Queima de gordura e início da cetose',
        title: '14 horas: Aumento significativo da lipólise',
        desc: 'O organismo aumenta significativamente a lipólise (quebra de gordura corporal para geração de energia).',
        color: '#F59E0B',
      };
    } else if (hours < 18) {
      return {
        category: 'De 14 a 18 horas: Queima de gordura e início da cetose',
        title: '16 horas: Método 16:8, cetose acelerando e início da autofagia',
        desc: 'Considerado o padrão mais popular (método 16:8). Aqui, a produção de corpos cetônicos pelo fígado começa a acelerar e pequenas respostas de autofagia (limpeza celular) têm início.',
        color: '#EF4444',
      };
    } else if (hours < 20) {
      return {
        category: 'De 14 a 18 horas: Queima de gordura e início da cetose',
        title: '18 horas: Elevação do HGH e foco mental aguçado',
        desc: 'O hormônio do crescimento (HGH) começa a se elevar substancialmente para proteger a massa magra. Os níveis de energia e foco mental aumentam graças aos corpos cetônicos que alimentam o cérebro.',
        color: '#EC4899',
      };
    } else if (hours < 22) {
      return {
        category: 'De 20 a 24 horas: Limpeza celular profunda (Autofagia)',
        title: '20 horas: Redução da inflamação sistêmica',
        desc: 'A transição para o uso de gordura como combustível é pronunciada. A inflamação sistêmica começa a dar sinais de redução.',
        color: '#D946EF',
      };
    } else if (hours < 24) {
      return {
        category: 'De 20 a 24 horas: Limpeza celular profunda (Autofagia)',
        title: '22 horas: Autofagia em níveis máximos',
        desc: 'A autofagia atinge níveis mais altos. Suas células começam a identificar e reciclar proteínas velhas, danificadas e componentes celulares disfuncionais.',
        color: '#A855F7',
      };
    } else {
      return {
        category: 'De 20 a 24 horas: Limpeza celular profunda (Autofagia)',
        title: '24 horas: Cetose profunda, reparo total e anti-inflamação',
        desc: 'O ciclo de um dia completo resulta no esgotamento severo do glicogênio. O corpo entra em um estado de cetose mais profundo, otimizando o reparo celular e reduzindo drasticamente marcadores inflamatórios.',
        color: '#FBBF24',
      };
    }
  };

  const metabolicInfo = getMetabolicStatus(elapsedHours);

  // SVG Circular Gauge calculation
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressPct / 100);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
              <Flame className="w-8 h-8 fill-amber-400/20" />
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Jejum Intermitente
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-300 font-medium">
            Progressão gradativa por estágios com recompensas e bonificações a cada meta cumprida.
          </p>
        </div>

        {/* User Stats Pill Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Stage Level Badge */}
          <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-black block leading-none">
                Estágio Atual
              </span>
              <span className="text-sm sm:text-base font-black text-white font-mono">
                Nível {profile.unlockedLevel} ({FASTING_STAGES.find((s) => s.level === profile.unlockedLevel)?.targetHours || 2}h)
              </span>
            </div>
          </div>

          {/* XP Badge */}
          <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-black block leading-none">
                Total XP
              </span>
              <span className="text-sm sm:text-base font-black text-cyan-400 font-mono">
                {profile.totalXp} XP
              </span>
            </div>
          </div>

          {/* Streak Days */}
          <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <span className="text-xs text-slate-400 uppercase font-black block leading-none">
                Sequência
              </span>
              <span className="text-sm sm:text-base font-black text-orange-400 font-mono">
                {profile.streakDays} dias
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl max-w-xl mx-auto w-full text-sm sm:text-base font-black">
        <button
          onClick={() => setActiveSubTab('tracker')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'tracker'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5 text-cyan-400" />
          <span>Painel</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stages')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'stages'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-5 h-5 text-amber-400" />
          <span>Estágios</span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-5 h-5 text-emerald-400" />
          <span>Histórico</span>
        </button>

        <button
          onClick={() => setActiveSubTab('tips')}
          className={`flex-1 py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'tips'
              ? 'bg-slate-800 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Droplet className="w-5 h-5 text-blue-400" />
          <span>Dicas</span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE TRACKER COCKPIT */}
      {activeSubTab === 'tracker' && (
        <div className="space-y-6 max-w-xl mx-auto w-full">
          {activeFast ? (
            /* ACTIVE FAST SCREEN (3X LARGER HERO TIMER & LABELS) */
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 text-center relative overflow-hidden shadow-2xl">
              {/* Dynamic Aura Glow */}
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-1000"
                style={{ backgroundColor: currentStage.color }}
              />

              {/* Active Ringing Alarm Notification Banner */}
              {isAlarmRinging && (
                <div className="p-5 bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-amber-500/20 border-2 border-emerald-500 rounded-2xl animate-pulse space-y-2 text-center shadow-lg relative z-10">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-black text-base sm:text-lg uppercase tracking-wider">
                    <Bell className="w-6 h-6 animate-bounce" />
                    <span>ALARME ATIVO: META DE {activeFast.targetHours}h CONCLUÍDA!</span>
                  </div>
                  <p className="text-sm sm:text-base text-slate-100 font-semibold">
                    O alarme sonoro e o aviso de voz foram disparados! Toque abaixo para silenciar e coletar sua bonificação.
                  </p>
                  <button
                    onClick={() => {
                      setIsAlarmRinging(false);
                      handleCompleteFast();
                    }}
                    className="w-full py-4 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base sm:text-lg transition-all shadow-md cursor-pointer"
                  >
                    Silenciar Alarme & Coletar Bonificação
                  </button>
                </div>
              )}

              {/* Header Badge */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-950 border border-slate-800 text-sm sm:text-base font-black text-slate-200">
                  <span className="w-3.5 h-3.5 rounded-full animate-pulse" style={{ backgroundColor: currentStage.color }} />
                  Estágio {currentStage.level}: Meta de {activeFast.targetHours}h
                </span>

                <span className="text-sm sm:text-base font-mono font-black text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-3.5 py-1 rounded-full">
                  +{currentStage.rewardXp} XP ao concluir
                </span>
              </div>

              {/* HERO 3X LARGER DIGITAL DISPLAY */}
              <div className="py-4 select-none">
                <span className="text-base sm:text-2xl font-black uppercase tracking-widest text-cyan-400 block mb-2">
                  TEMPO EM JEJUM
                </span>

                <div className="font-mono text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tight tabular-nums drop-shadow-2xl leading-none py-2">
                  {formatHourMin(elapsedSeconds)}
                </div>

                <div className="mt-3 text-lg sm:text-2xl font-black text-slate-200 font-mono tabular-nums">
                  {progressPct >= 100 ? (
                    <span className="text-emerald-400 font-black">Meta Atingida! (+{formatHourMin(elapsedSeconds - targetSeconds)})</span>
                  ) : (
                    <span>Restam: <strong className="text-white font-mono">{formatHourMin(remainingSeconds)}</strong></span>
                  )}
                </div>
              </div>

              {/* High-Visibility Progress Track Bar */}
              <div className="w-full space-y-2.5">
                <div className="h-6 w-full bg-slate-950 rounded-full overflow-hidden border-2 border-slate-800 p-0.5">
                  <div
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: currentStage.color,
                    }}
                    className="h-full rounded-full transition-[width] duration-1000 ease-linear shadow-lg"
                  />
                </div>
                <div className="flex justify-between items-center text-sm sm:text-lg font-black font-mono tabular-nums px-1">
                  <span className="text-slate-300">Objetivo: {activeFast.targetHours}h</span>
                  <span className="text-amber-400 font-black text-base sm:text-xl">{Math.round(progressPct)}% CONCLUÍDO</span>
                </div>
              </div>

              {/* Real-time Biological Stage Indicator */}
              <div className="bg-slate-950 border-2 border-slate-800/80 rounded-2xl p-5 text-left space-y-2.5">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 block">
                  {metabolicInfo.category}
                </span>

                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: metabolicInfo.color }} />
                  <span className="text-base sm:text-xl font-black text-white">
                    {metabolicInfo.title}
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 block">
                    O que está sendo bom para você agora:
                  </span>
                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                    {metabolicInfo.desc}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={handleCompleteFast}
                  className={`w-full py-5 px-6 rounded-2xl font-black text-base sm:text-xl transition-all shadow-xl active:scale-98 cursor-pointer flex items-center justify-center gap-3 ${
                    progressPct >= 98
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 animate-pulse'
                      : 'bg-white hover:bg-slate-100 text-slate-950'
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>
                    {progressPct >= 98 ? 'CONCLUIR JEJUM & COLETAR RECOMPENSA' : 'Encerrar Jejum Agora'}
                  </span>
                </button>

                <div className="flex items-center justify-between text-sm sm:text-base text-slate-400 px-2 pt-1 font-semibold">
                  <button
                    onClick={() => setIsAdjustStartTimeOpen(true)}
                    className="hover:text-white underline cursor-pointer"
                  >
                    Ajustar horário de início
                  </button>

                  <button
                    onClick={handleCancelFast}
                    className="hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Cancelar jejum
                  </button>
                </div>

                <button
                  onClick={handleTestAlarm}
                  className="mt-2 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer w-full"
                  title="Testar como toca o alarme e a fala de voz ao atingir a meta"
                >
                  <Bell className="w-5 h-5 text-cyan-400" />
                  <span>Testar Alarme Sonoro e Voz de Conclusão</span>
                </button>
              </div>
            </div>
          ) : (
            /* IDLE SCREEN (NO ACTIVE FAST) - 3X LARGER FONTS */
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-10 space-y-6 text-center shadow-xl">
              <div className="w-24 h-24 mx-auto rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center">
                <Clock className="w-12 h-12 text-cyan-400" />
              </div>

              <div>
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/15 px-4 py-1.5 rounded-full border border-cyan-500/30">
                  Pronto para Iniciar
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white mt-3">
                  Estágio {currentStage.level}: {currentStage.name}
                </h2>
                <p className="text-sm sm:text-lg text-slate-300 font-medium mt-2 max-w-md mx-auto leading-relaxed">
                  {currentStage.description}
                </p>
              </div>

              {/* Stage Goal Highlight */}
              <div className="p-6 bg-slate-950 border-2 border-slate-800 rounded-2xl flex items-center justify-around">
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-slate-400 font-black uppercase block mb-1">Meta</span>
                  <span className="text-3xl sm:text-5xl font-black text-white font-mono">{currentStage.targetHours} Horas</span>
                </div>
                <div className="h-12 w-[2px] bg-slate-800" />
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-slate-400 font-black uppercase block mb-1">Bonificação</span>
                  <span className="text-3xl sm:text-5xl font-black text-amber-400 font-mono">+{currentStage.rewardXp} XP</span>
                </div>
              </div>

              {/* Stage Biological Benefits */}
              <div className="bg-slate-950/80 border-2 border-slate-800/80 rounded-2xl p-5 text-left space-y-3">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400 block">
                  Benefícios Deste Estágio:
                </span>
                <ul className="space-y-2 text-sm sm:text-base text-slate-200 font-medium">
                  {currentStage.metabolicBenefits.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="text-emerald-400 font-black mt-0.5 text-lg">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Start Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <button
                  onClick={() => handleStartFast()}
                  className="w-full py-5 px-6 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-base sm:text-2xl transition-all shadow-xl shadow-cyan-500/25 active:scale-98 cursor-pointer flex items-center justify-center gap-3"
                >
                  <Play className="w-6 h-6 fill-slate-950" />
                  <span>INICIAR JEJUM DE {currentStage.targetHours} HORAS</span>
                </button>

                <button
                  onClick={() => setIsAdjustStartTimeOpen(true)}
                  className="text-sm sm:text-base text-slate-400 hover:text-white font-bold py-1.5 transition-colors cursor-pointer"
                >
                  Iniciei mais cedo? Ajustar horário
                </button>

                <button
                  onClick={handleTestAlarm}
                  className="mt-1 py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-colors cursor-pointer w-full"
                  title="Testar como soa o alarme sonoro e aviso de voz"
                >
                  <Volume2 className="w-5 h-5 text-amber-400" />
                  <span>Testar Alarme Sonoro e Voz de Conclusão</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PROGRESSIVE STAGES LADDER */}
      {activeSubTab === 'stages' && (
        <div className="space-y-5 max-w-xl mx-auto w-full">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-3 shadow-lg">
            <h3 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Trophy className="w-7 h-7 text-amber-400" />
              <span>Escalada Gradativa de Estágios</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              O jejum intermitente é uma habilidade metabólica. Comece pelo Estágio 1 (2h) e, ao cumprir a meta, você recebe a bonificação em XP, conquista a medalha e desbloqueia o próximo estágio sucessivamente!
            </p>
          </div>

          <div className="space-y-3.5">
            {FASTING_STAGES.map((stg) => {
              const isUnlocked = stg.level <= profile.unlockedLevel;
              const isSelected = selectedStageLevel === stg.level;
              const hasBadge = profile.unlockedBadges.includes(stg.badgeName);

              return (
                <div
                  key={stg.level}
                  onClick={() => {
                    if (isUnlocked && !profile.activeFast) {
                      setSelectedStageLevel(stg.level);
                      setActiveSubTab('tracker');
                    }
                  }}
                  className={`p-6 rounded-3xl border-2 transition-all ${
                    isUnlocked
                      ? isSelected
                        ? 'bg-slate-900 border-cyan-500 shadow-xl cursor-pointer ring-2 ring-cyan-500/20'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 cursor-pointer'
                      : 'bg-slate-950/60 border-slate-900 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-lg sm:text-2xl shrink-0 border-2 shadow-inner"
                        style={{
                          backgroundColor: isUnlocked ? `${stg.color}15` : '#1e293b',
                          borderColor: isUnlocked ? `${stg.color}40` : '#334155',
                          color: isUnlocked ? stg.color : '#64748b',
                        }}
                      >
                        {isUnlocked ? `${stg.targetHours}h` : <Lock className="w-7 h-7 text-slate-500" />}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-400">
                            Estágio {stg.level}
                          </span>
                          {hasBadge && (
                            <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300 bg-amber-500/20 px-3 py-0.5 rounded-full border border-amber-500/30">
                              <Award className="w-4 h-4 text-amber-400" />
                              Conquistado
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg sm:text-2xl font-black text-white">{stg.name} ({stg.targetHours} Horas)</h4>
                        <p className="text-sm sm:text-base text-slate-300 font-medium leading-snug">{stg.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm sm:text-lg font-mono font-black text-cyan-400 block">
                        +{stg.rewardXp} XP
                      </span>
                      {isUnlocked ? (
                        isSelected ? (
                          <span className="text-xs sm:text-sm font-black text-emerald-400 block mt-1">Ativo</span>
                        ) : (
                          <span className="text-xs sm:text-sm font-bold text-cyan-400 underline block mt-1">Selecionar</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-500 font-bold block mt-1">
                          🔒 Nível {stg.level - 1} exigido
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: HISTORY & ACHIEVEMENTS */}
      {activeSubTab === 'history' && (
        <div className="space-y-6 max-w-xl mx-auto w-full">
          {/* Achievements Showcase */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2.5">
              <Award className="w-6 h-6 text-amber-400" />
              <span>Medalhas & Bonificações Conquistadas</span>
            </h3>

            {profile.unlockedBadges.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.unlockedBadges.map((badge, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-950 border-2 border-amber-500/30 rounded-2xl flex flex-col items-center text-center gap-1.5 shadow-md"
                  >
                    <Trophy className="w-8 h-8 text-amber-400" />
                    <span className="text-sm sm:text-base font-black text-white">{badge}</span>
                    <span className="text-xs text-emerald-400 font-black">Desbloqueado</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm sm:text-base space-y-2 font-medium">
                <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
                <p>Nenhuma medalha ainda. Conclua seu primeiro jejum de 2 horas para receber sua primeira bonificação!</p>
              </div>
            )}
          </div>

          {/* History List */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2.5">
              <History className="w-6 h-6 text-cyan-400" />
              <span>Histórico de Sessões de Jejum</span>
            </h3>

            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-lg font-black text-white">
                          Estágio {s.stageLevel} ({s.targetHours}h)
                        </span>
                        {s.success ? (
                          <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                            Sucesso
                          </span>
                        ) : (
                          <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full">
                            Parcial
                          </span>
                        )}
                      </div>
                      <span className="text-xs sm:text-sm text-slate-400 block font-mono">
                        {new Date(s.startTime).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(s.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base sm:text-xl font-black text-white font-mono block">
                        {Math.floor(s.completedHours)}h {Math.round((s.completedHours % 1) * 60)}m
                      </span>
                      <span className="text-xs sm:text-sm text-cyan-400 font-bold font-mono">
                        +{s.xpEarned || 0} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm sm:text-base font-medium">
                Nenhum jejum registrado ainda.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: HEALTH & HYDRATION TIPS */}
      {activeSubTab === 'tips' && (
        <div className="space-y-6 max-w-xl mx-auto w-full">
          {/* Biological Roadmap Card */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-lg">
            <h3 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Sparkles className="w-7 h-7 text-amber-400" />
              <span>O Que o Jejum Faz Pelo Seu Corpo</span>
            </h3>
            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
              Veja exatamente o que está acontecendo de bom no seu organismo a cada fase atingida:
            </p>

            <div className="space-y-4">
              {/* Phase 1 */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border-2 border-cyan-500/30 space-y-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400 block">
                  De 2 a 6 horas: Fase alimentada e início da digestão
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-black">•</span>
                    <span><strong>2 horas:</strong> O corpo está na fase anabólica ativa. Ele absorve os nutrientes da refeição mais recente, elevando temporariamente o açúcar no sangue e a insulina.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-black">•</span>
                    <span><strong>4 horas:</strong> O processo de digestão principal termina na maioria das pessoas. Os níveis de glicose no sangue começam a se estabilizar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 font-black">•</span>
                    <span><strong>6 horas:</strong> A insulina começa a cair gradualmente. O pâncreas ganha um descanso da produção constante deste hormônio.</span>
                  </li>
                </ul>
              </div>

              {/* Phase 2 */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border-2 border-indigo-500/30 space-y-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-indigo-400 block">
                  De 8 a 12 horas: A virada metabólica
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-black">•</span>
                    <span><strong>8 horas:</strong> O fígado começa a liberar o glicogênio estocado para manter a energia circulante.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-black">•</span>
                    <span><strong>10 horas:</strong> Os níveis de insulina reduzem-se drasticamente, enviando um sinal químico para que o corpo mude a sua fonte principal de energia.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-black">•</span>
                    <span><strong>12 horas:</strong> Inicia-se o estado de jejum real. Os estoques de glicogênio hepático começam a se esgotar, dando o "sinal verde" inicial para a mobilização de gordura.</span>
                  </li>
                </ul>
              </div>

              {/* Phase 3 */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border-2 border-amber-500/30 space-y-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 block">
                  De 14 a 18 horas: Queima de gordura e início da cetose
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-black">•</span>
                    <span><strong>14 horas:</strong> O organismo aumenta significativamente a lipólise (quebra de gordura corporal para geração de energia).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-black">•</span>
                    <span><strong>16 horas:</strong> Considerado o padrão mais popular (método 16:8). Aqui, a produção de corpos cetônicos pelo fígado começa a acelerar e pequenas respostas de autofagia (limpeza celular) têm início.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-black">•</span>
                    <span><strong>18 horas:</strong> O hormônio do crescimento (HGH) começa a se elevar substancialmente para proteger a massa magra. Os níveis de energia e foco mental aumentam graças aos corpos cetônicos que alimentam o cérebro.</span>
                  </li>
                </ul>
              </div>

              {/* Phase 4 */}
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border-2 border-purple-500/30 space-y-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-400 block">
                  De 20 a 24 horas: Limpeza celular profunda (Autofagia)
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-200 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-black">•</span>
                    <span><strong>20 horas:</strong> A transição para o uso de gordura como combustível é pronunciada. A inflamação sistêmica começa a dar sinais de redução.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-black">•</span>
                    <span><strong>22 horas:</strong> A autofagia atinge níveis mais altos. Suas células começam a identificar e reciclar proteínas velhas, danificadas e componentes celulares disfuncionais.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-black">•</span>
                    <span><strong>24 horas:</strong> O ciclo de um dia completo resulta no esgotamento severo do glicogênio. O corpo entra em um estado de cetose mais profundo, otimizando o reparo celular e reduzindo drasticamente marcadores inflamatórios.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Droplet className="w-7 h-7 text-sky-400" />
              <span>O Que Pode Durante o Jejum?</span>
            </h3>

            <div className="space-y-4">
              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 shrink-0">
                  <Droplet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">Água à vontade (com ou sem gás)</h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                    Fundamental para a hidratação e eliminação de toxinas. Você pode adicionar rodelas de limão ou folhas de hortelã.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 shrink-0">
                  <Coffee className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">Café preto (sem açúcar)</h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                    A cafeína acelera suavemente a queima de gordura e auxilia a inibir o apetite momentâneo. Não adicione leite ou adoçantes calóricos.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">Chás naturais puros</h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                    Chá verde, camomila, hortelã e gengibre são excelentes para acalmar a fome e proteger o trato digestivo.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 bg-slate-950 rounded-2xl border border-slate-800 flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 shrink-0">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white">Pitada de sal / Eletrólitos</h4>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                    Se sentir leve tontura ou dor de cabeça, uma pitadinha de sal mineral na água repõe sódio e minerais essenciais.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl space-y-1.5">
              <span className="text-sm sm:text-base font-black text-rose-300 uppercase tracking-wider block">
                O Que Quebra o Jejum?
              </span>
              <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                Açúcar, leite, sucos, frutas, alimentos sólidos, suplementos com carboidratos/proteínas (whey, BCAA) e refrigerantes calóricos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ADJUST START TIME MODAL */}
      {isAdjustStartTimeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-5 shadow-2xl">
            <h3 className="text-lg sm:text-2xl font-black text-white">Ajustar Horário de Início</h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Caso já tenha começado a jejuar antes de acionar o aplicativo, indique quantas horas atrás você fez sua última refeição:
            </p>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-black text-slate-300">Horas atrás (ex: 1, 2, 3):</label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={adjustedHoursAgo}
                onChange={(e) => setAdjustedHoursAgo(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-4 text-white font-mono font-black text-2xl focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsAdjustStartTimeOpen(false)}
                className="flex-1 py-4 rounded-xl bg-slate-800 text-slate-300 font-black text-sm hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  const hrs = parseFloat(adjustedHoursAgo) || 0;
                  const customStart = Date.now() - hrs * 3600 * 1000;
                  handleStartFast(customStart);
                }}
                className="flex-1 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm transition-colors cursor-pointer"
              >
                Salvar Início
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Milestone Passed Celebration Modal */}
      {activeMilestoneCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl relative overflow-hidden">
            {/* Top ambient glow */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-25"
              style={{ backgroundColor: activeMilestoneCelebration.stage.color }}
            />

            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Trophy className="w-10 h-10 text-emerald-400 animate-bounce" />
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Fase Atingida: {activeMilestoneCelebration.stage.targetHours} Horas!
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Bonificação: +{activeMilestoneCelebration.xpEarned} XP!
              </h3>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">
                {activeMilestoneCelebration.stage.category}
              </span>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 block">
                  O que está sendo bom para você agora:
                </span>
                <p className="text-xs sm:text-sm text-slate-100 font-medium leading-relaxed">
                  {activeMilestoneCelebration.stage.exactUserBenefit}
                </p>
              </div>
            </div>

            {activeMilestoneCelebration.newLevelUnlocked && (
              <div className="text-xs sm:text-sm font-bold text-cyan-300 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/30">
                🎉 Próximo estágio ({FASTING_STAGES.find((s) => s.level === activeMilestoneCelebration.newLevelUnlocked)?.targetHours || 4}h) desbloqueado!
              </div>
            )}

            <button
              onClick={() => setActiveMilestoneCelebration(null)}
              className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base transition-all shadow-lg active:scale-98 cursor-pointer"
            >
              Continuar Jejuando
            </button>
          </div>
        </div>
      )}

      {/* Fasting Reward & Stage Unlock Celebration Modal */}
      <FastingRewardModal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        session={rewardResult?.session || null}
        unlockedNewLevel={rewardResult?.unlockedNewLevel || false}
        newLevelUnlocked={rewardResult?.newLevelUnlocked}
        newBadgeEarned={rewardResult?.newBadgeEarned}
        xpEarned={rewardResult?.xpEarned || 0}
      />
    </div>
  );
};
