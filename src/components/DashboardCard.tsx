import React from 'react';
import { DashboardSummary } from '../types/workout';
import { Flame, Zap, Activity, Coffee, Clock, Layers } from 'lucide-react';

interface DashboardCardProps {
  dashboard: DashboardSummary;
  compact?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ dashboard, compact = false }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Tempo Total Estimado
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              {dashboard.formattedTotalTime}
              <span className="text-xs font-medium text-slate-400">
                ({dashboard.totalSeconds}s)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{dashboard.totalStepsCount} {dashboard.totalStepsCount === 1 ? 'etapa' : 'etapas'}</span>
          {dashboard.totalRepetitionsCount > 0 && (
            <span className="text-blue-400 ml-1">({dashboard.totalRepetitionsCount}x reps)</span>
          )}
        </div>
      </div>

      {/* Effort Distribution Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="flex justify-between text-[11px] text-slate-400 font-medium">
          <span>Distribuição de Esforço</span>
          <span>{dashboard.totalSeconds > 0 ? '100% planejado' : 'Adicione etapas'}</span>
        </div>
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
          {dashboard.pctWarmup > 0 && (
            <div
              style={{ width: `${dashboard.pctWarmup}%` }}
              className="h-full bg-amber-500 rounded-l-full transition-all duration-300"
              title={`Aquecimento: ${dashboard.formattedWarmup} (${dashboard.pctWarmup.toFixed(0)}%)`}
            />
          )}
          {dashboard.pctHighIntensity > 0 && (
            <div
              style={{ width: `${dashboard.pctHighIntensity}%` }}
              className="h-full bg-rose-600 transition-all duration-300"
              title={`Alta Intensidade: ${dashboard.formattedHighIntensity} (${dashboard.pctHighIntensity.toFixed(0)}%)`}
            />
          )}
          {dashboard.pctLowIntensity > 0 && (
            <div
              style={{ width: `${dashboard.pctLowIntensity}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`Baixa Intensidade: ${dashboard.formattedLowIntensity} (${dashboard.pctLowIntensity.toFixed(0)}%)`}
            />
          )}
          {dashboard.pctRest > 0 && (
            <div
              style={{ width: `${dashboard.pctRest}%` }}
              className="h-full bg-slate-500 rounded-r-full transition-all duration-300"
              title={`Descanso: ${dashboard.formattedRest} (${dashboard.pctRest.toFixed(0)}%)`}
            />
          )}
          {dashboard.totalSeconds === 0 && (
            <div className="w-full h-full bg-slate-700/50 rounded-full" />
          )}
        </div>
      </div>

      {/* Grid of Effort Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Aquecimento */}
        <div className="bg-slate-800/60 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">Aquecimento</div>
            <div className="text-sm font-bold text-amber-300">{dashboard.formattedWarmup}</div>
          </div>
        </div>

        {/* Alta Intensidade */}
        <div className="bg-slate-800/60 border border-rose-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">Alta Intensidade</div>
            <div className="text-sm font-bold text-rose-300">{dashboard.formattedHighIntensity}</div>
          </div>
        </div>

        {/* Baixa Intensidade */}
        <div className="bg-slate-800/60 border border-emerald-500/20 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">Baixa Intensidade</div>
            <div className="text-sm font-bold text-emerald-300">{dashboard.formattedLowIntensity}</div>
          </div>
        </div>

        {/* Descanso */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-700/50 text-slate-300">
            <Coffee className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">Descanso</div>
            <div className="text-sm font-bold text-slate-300">{dashboard.formattedRest}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
