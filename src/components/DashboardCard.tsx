import React from 'react';
import { DashboardSummary } from '../types/workout';

interface DashboardCardProps {
  dashboard: DashboardSummary;
  compact?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ dashboard }) => {
  return (
    <div className="bg-slate-900/95 border border-slate-800/90 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      {/* Top Header: Total Time as Dominant Anchor */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase block mb-1">
            Tempo Total Estimado
          </span>
          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight font-mono tabular-nums">
            {dashboard.formattedTotalTime}
          </div>
        </div>

        <div className="text-right text-xs text-slate-400 font-medium">
          <span className="text-white font-semibold tabular-nums">{dashboard.totalStepsCount}</span> etapas
          {dashboard.totalRepetitionsCount > 0 && (
            <span className="text-slate-400"> · {dashboard.totalRepetitionsCount}x repetições</span>
          )}
        </div>
      </div>

      {/* Distribution Progress Bar */}
      <div className="space-y-2 mb-5">
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 gap-1 border border-slate-800">
          {dashboard.pctWarmup > 0 && (
            <div
              style={{ width: `${dashboard.pctWarmup}%` }}
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              title={`Aquecimento: ${dashboard.formattedWarmup}`}
            />
          )}
          {dashboard.pctHighIntensity > 0 && (
            <div
              style={{ width: `${dashboard.pctHighIntensity}%` }}
              className="h-full bg-rose-500 rounded-full transition-all duration-300"
              title={`Tiro Forte: ${dashboard.formattedHighIntensity}`}
            />
          )}
          {dashboard.pctLowIntensity > 0 && (
            <div
              style={{ width: `${dashboard.pctLowIntensity}%` }}
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              title={`Trote / Caminhada: ${dashboard.formattedLowIntensity}`}
            />
          )}
          {dashboard.pctRest > 0 && (
            <div
              style={{ width: `${dashboard.pctRest}%` }}
              className="h-full bg-slate-600 rounded-full transition-all duration-300"
              title={`Descanso: ${dashboard.formattedRest}`}
            />
          )}
          {dashboard.totalSeconds === 0 && (
            <div className="w-full h-full bg-slate-800 rounded-full" />
          )}
        </div>
      </div>

      {/* Clean Unboxed Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-400 font-medium">Aquecimento</span>
          </div>
          <div className="text-sm font-bold text-white font-mono tabular-nums">
            {dashboard.formattedWarmup}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs text-slate-400 font-medium">Tiro Forte</span>
          </div>
          <div className="text-sm font-bold text-rose-400 font-mono tabular-nums">
            {dashboard.formattedHighIntensity}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400 font-medium">Trote / Caminhada</span>
          </div>
          <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
            {dashboard.formattedLowIntensity}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-xs text-slate-400 font-medium">Descanso</span>
          </div>
          <div className="text-sm font-bold text-slate-300 font-mono tabular-nums">
            {dashboard.formattedRest}
          </div>
        </div>
      </div>
    </div>
  );
};
