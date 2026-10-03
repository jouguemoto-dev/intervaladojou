import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { FastingSession, FASTING_STAGES } from '../types/fasting';
import { audioAlerts } from '../utils/soundAndTts';
import {
  Trophy,
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Award,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface FastingRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: FastingSession | null;
  unlockedNewLevel: boolean;
  newLevelUnlocked?: number;
  newBadgeEarned?: string;
  xpEarned: number;
}

export const FastingRewardModal: React.FC<FastingRewardModalProps> = ({
  isOpen,
  onClose,
  session,
  unlockedNewLevel,
  newLevelUnlocked,
  newBadgeEarned,
  xpEarned,
}) => {
  useEffect(() => {
    if (isOpen && session?.success) {
      try {
        confetti({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.6 },
        });
        audioAlerts.playFastingCompletionAlarm(session.targetHours);
      } catch {
        // Fallback
      }
    }
  }, [isOpen, session?.success, session?.targetHours]);

  if (!isOpen || !session) return null;

  const currentStage = FASTING_STAGES.find((s) => s.level === session.stageLevel) || FASTING_STAGES[0];
  const nextStage = newLevelUnlocked
    ? FASTING_STAGES.find((s) => s.level === newLevelUnlocked)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center overflow-hidden">
        {/* Ambient Top Glow */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ backgroundColor: currentStage.color }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {session.success ? (
          <div className="space-y-5">
            {/* Trophy Hero Icon */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] shadow">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Meta Cumprida com Sucesso!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Jejum de {session.targetHours}h Finalizado!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                Tempo total em jejum:{' '}
                <strong className="text-emerald-400 font-mono">
                  {Math.floor(session.completedHours)}h {Math.round((session.completedHours % 1) * 60)}m
                </strong>
              </p>
            </div>

            {/* Rewards Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-left">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Experiência Ganha
                </span>
                <span className="text-base font-black text-cyan-400 font-mono">
                  +{xpEarned} XP
                </span>
              </div>

              {newBadgeEarned && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    Nova Medalha
                  </span>
                  <span className="text-xs font-black text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {newBadgeEarned}
                  </span>
                </div>
              )}

              {/* Exact user benefit explanation of what was good - 2X LARGER */}
              <div className="p-4 sm:p-5 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl space-y-2">
                <span className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-400 block">
                  O que foi bom para você nesta fase ({currentStage.targetHours}h):
                </span>
                <p className="text-base sm:text-xl text-slate-100 font-bold leading-relaxed">
                  {currentStage.exactUserBenefit}
                </p>
              </div>

              {/* UNLOCKED NEXT STAGE PROMOTION! */}
              {unlockedNewLevel && nextStage && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border-2 border-emerald-500/40 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-sm sm:text-base font-black text-emerald-300 uppercase tracking-wider">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>Próximo Estágio Desbloqueado!</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg sm:text-xl font-black text-white">
                        Estágio {nextStage.level}: {nextStage.targetHours} Horas
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-300 font-semibold">{nextStage.name}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                      <ArrowRight className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-cyan-200 font-semibold leading-relaxed pt-2 border-t border-emerald-500/20">
                    <strong className="text-white">Próximo benefício:</strong> {nextStage.exactUserBenefit}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
            >
              Coletar Bonificação & Continuar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center">
              <Flame className="w-8 h-8 text-orange-400" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Jejum Encerrado</h2>
              <p className="text-xs text-slate-400 mt-1">
                Você completou{' '}
                <strong className="text-white">
                  {Math.floor(session.completedHours)}h {Math.round((session.completedHours % 1) * 60)}m
                </strong>{' '}
                do objetivo de {session.targetHours}h.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs space-y-1 text-slate-300">
              <span className="font-bold text-slate-200 block">Dica para a próxima:</span>
              <p className="text-[11px] text-slate-400">
                Lembre-se de tomar bastante água e chás sem açúcar durante os períodos de fome passageira.
              </p>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-bold">XP de Participação</span>
              <span className="text-sm font-black text-cyan-400">+{xpEarned} XP</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
