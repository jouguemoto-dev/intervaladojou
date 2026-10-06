import React, { useState, useEffect } from 'react';
import {
  loadLocalFastingProfile,
  loadLocalFastingHistory,
  startFastSession,
  completeActiveFast,
} from '../services/fastingService';
import { FastingProfile, FastingSession, FASTING_STAGES } from '../types/fasting';
import { formatTimeDisplay } from '../utils/dashboardCalculator';
import {
  Flame,
  Zap,
  Clock,
  Trophy,
  Award,
  CheckCircle2,
  Play,
  ChevronRight,
  TrendingUp,
  Droplet,
  Sparkles,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';

interface FastingHomeProgressCardProps {
  onOpenFastingTab: () => void;
}

export const FastingHomeProgressCard: React.FC<FastingHomeProgressCardProps> = ({
  onOpenFastingTab,
}) => {
  const [profile, setProfile] = useState<FastingProfile>(() => loadLocalFastingProfile());
  const [history, setHistory] = useState<FastingSession[]>(() => loadLocalFastingHistory());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Reload profile from storage when mounted and when updated anywhere in the app
  useEffect(() => {
    const refreshData = () => {
      setProfile(loadLocalFastingProfile());
      setHistory(loadLocalFastingHistory());
    };

    refreshData();

    window.addEventListener('fasting-updated', refreshData);
    window.addEventListener('storage', refreshData);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('fasting-updated', refreshData);
      window.removeEventListener('storage', refreshData);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Live timer tick if fast is active
  useEffect(() => {
    if (!profile.activeFast) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      if (!profile.activeFast) return;
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - profile.activeFast.startTime) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [profile.activeFast]);

  const activeFast = profile.activeFast;
  const currentStage =
    FASTING_STAGES.find((s) => s.level === (activeFast ? activeFast.stageLevel : profile.unlockedLevel)) ||
    FASTING_STAGES[0];

  const targetSeconds = (activeFast ? activeFast.targetHours : currentStage.targetHours) * 3600;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const progressPct = Math.min(100, Math.max(0, (elapsedSeconds / targetSeconds) * 100));

  // Current Biological benefit calculation
  const elapsedHours = elapsedSeconds / 3600;
  const getMetabolicInfo = (hours: number) => {
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

  const metabolicInfo = getMetabolicInfo(elapsedHours);
  const totalFastingHours = Math.floor((profile.totalFastingSeconds || 0) / 3600);
  const totalFastingMinutes = Math.round(((profile.totalFastingSeconds || 0) % 3600) / 60);

  const handleStartFastDirect = () => {
    const updated = startFastSession(profile.unlockedLevel);
    setProfile(updated);
  };

  return (
    <div className="bg-slate-900 border-2 border-slate-800 hover:border-slate-700/80 rounded-3xl p-5 sm:p-6 transition-all shadow-xl space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/20 text-amber-400">
            <Flame className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              Progresso com Jejum Intermitente
            </h2>
            <span className="text-xs text-slate-400 font-semibold">
              Sua evolução metabólica, situação atual e histórico acumulado
            </span>
          </div>
        </div>

        <button
          onClick={onOpenFastingTab}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0"
        >
          <span>Abrir Painel</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SEÇÃO 1: SITUAÇÃO ATUAL */}
      <div className="bg-slate-950/80 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                activeFast ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'
              }`}
            />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300">
              {activeFast ? 'SITUAÇÃO ATUAL: JEJUM EM ANDAMENTO' : 'SITUAÇÃO ATUAL: LIVRE (DESCANSO)'}
            </span>
          </div>

          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Estágio {currentStage.level}: {currentStage.targetHours}h ({currentStage.name})
          </span>
        </div>

        {activeFast ? (
          /* TEMPO ATIVO AO VIVO */
          <div className="space-y-4 pt-1">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <span className="text-xs sm:text-sm text-slate-400 uppercase font-black block tracking-wider">
                  Tempo Decorrido em Jejum
                </span>
                <span className="font-mono text-5xl sm:text-6xl font-black text-white tracking-tight tabular-nums block">
                  {formatTimeDisplay(elapsedSeconds)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs sm:text-sm text-slate-400 uppercase font-black block tracking-wider">
                  Meta do Estágio
                </span>
                <span className="text-lg sm:text-xl font-black text-amber-400 font-mono block">
                  {Math.round(progressPct)}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Restam {formatTimeDisplay(remainingSeconds)}
                </span>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                style={{ width: `${progressPct}%`, backgroundColor: currentStage.color }}
                className="h-full rounded-full transition-all duration-1000 ease-linear shadow"
              />
            </div>

            {/* Mensagem Biológica ao Vivo com Letras Grandes e Nítidas */}
            <div className="p-4 bg-slate-900/95 border-2 border-amber-500/40 rounded-2xl space-y-2 text-left shadow-lg">
              <span className="text-xs sm:text-sm font-black uppercase text-amber-400 block tracking-wide">
                {metabolicInfo.category}
              </span>
              <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                <strong className="text-emerald-300 block mb-1 font-bold text-sm sm:text-base">
                  O que está sendo bom para você agora ({metabolicInfo.title}):
                </strong>
                {metabolicInfo.desc}
              </p>
            </div>

            <button
              onClick={onOpenFastingTab}
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Gerenciar Jejum no Cockpit</span>
            </button>
          </div>
        ) : (
          /* SEM JEJUM ATIVO (PRONTO PARA INICIAR) */
          <div className="space-y-3 pt-1 text-left">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Você não possui nenhum jejum ativo no momento. Pronto para o próximo desafio de{' '}
              <strong className="text-cyan-400">{currentStage.targetHours} horas</strong> com bonificação de{' '}
              <strong className="text-amber-400">+{currentStage.rewardXp} XP</strong>!
            </p>

            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed">
              <strong className="text-cyan-300 block mb-0.5">Benefício Biológico do Estágio {currentStage.level}:</strong>
              {currentStage.exactUserBenefit}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleStartFastDirect}
                className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>INICIAR JEJUM DE {currentStage.targetHours}H AGORA</span>
              </button>

              <button
                onClick={onOpenFastingTab}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Detalhes
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: QUANTO JEJUM JÁ FIZ (HISTÓRICO & ACUMULADO) */}
      <div className="space-y-3">
        <span className="text-xs font-black uppercase tracking-wider text-slate-400 block px-1">
          Quanto Jejum Você Já Fez (Acumulado)
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Total de Jejuns Concluídos */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-black block">
              Jejuns Concluídos
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums block">
              {profile.totalCompletedFasts || 0}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">sessões salvas</span>
          </div>

          {/* Card 2: Horas Totais Acumuladas */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-black block">
              Horas Acumuladas
            </span>
            <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono tabular-nums block">
              {totalFastingHours}h {totalFastingMinutes}m
            </span>
            <span className="text-[10px] text-cyan-300 font-bold">tempo total em jejum</span>
          </div>

          {/* Card 3: Sequência Atual */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-black block">
              Sequência
            </span>
            <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono tabular-nums block">
              {profile.streakDays || 0} dias
            </span>
            <span className="text-[10px] text-orange-300 font-bold">disciplina diária</span>
          </div>

          {/* Card 4: Estágio / Nível Atual */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-black block">
              Nível Atual
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tabular-nums block">
              Nível {profile.unlockedLevel} / 12
            </span>
            <span className="text-[10px] text-amber-300 font-bold">
              {FASTING_STAGES.find((s) => s.level === profile.unlockedLevel)?.targetHours || 2}h meta
            </span>
          </div>
        </div>

        {/* Barra de Recompensas e Medalhas */}
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300">
              Total de Bonificação: <strong className="text-cyan-400 font-mono">{profile.totalXp || 0} XP</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300">
              Medalhas Conquistadas: <strong className="text-amber-300 font-mono">{profile.unlockedBadges?.length || 0}</strong>
            </span>
          </div>
        </div>

        {/* Mini Histórico dos Últimos Jejuns */}
        {history.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-black uppercase text-slate-500 block px-1">
              Últimas Sessões Registradas
            </span>
            <div className="space-y-1.5">
              {history.slice(0, 2).map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Estágio {s.stageLevel} ({s.targetHours}h)</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(s.startTime).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-emerald-400 font-bold">
                      {Math.floor(s.completedHours)}h {Math.round((s.completedHours % 1) * 60)}m
                    </span>
                    <span className="text-cyan-400 font-bold">+{s.xpEarned || 0} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
