import React, { useState } from 'react';
import { Workout } from '../types/workout';
import { calculateWorkoutDashboard } from '../utils/dashboardCalculator';
import {
  Play,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface WorkoutListProps {
  workouts: Workout[];
  onSelectWorkout: (workout: Workout) => void;
  onEditWorkout: (workout: Workout) => void;
  onCreateNew: () => void;
  onDuplicateWorkout: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
  onResetDefaults: () => void;
}

export const WorkoutList: React.FC<WorkoutListProps> = ({
  workouts,
  onSelectWorkout,
  onEditWorkout,
  onCreateNew,
  onDuplicateWorkout,
  onDeleteWorkout,
  onResetDefaults,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-20">
      {/* Header Area */}
      <div className="px-5 pt-6 pb-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Treinos
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Selecione uma sessão ou crie uma nova estrutura intervalada
            </p>
          </div>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-all active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Treino</span>
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="px-5 max-w-4xl mx-auto w-full space-y-3.5 flex-1">
        {workouts.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 max-w-md mx-auto">
            <h3 className="text-base font-bold text-white">Nenhum treino disponível</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
              Monte seu primeiro treino com tiros e trotes ou recupere os modelos de exemplo pré-configurados.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={onCreateNew}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Criar Treino do Zero
              </button>
              <button
                onClick={onResetDefaults}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Restaurar Modelos de Exemplo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-medium tracking-wide">Biblioteca de Sessões ({workouts.length})</span>
              <button
                onClick={onResetDefaults}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar padrões</span>
              </button>
            </div>

            {workouts.map((workout) => {
              const summary = calculateWorkoutDashboard(workout.items);
              const isDeleting = deleteConfirmId === workout.id;

              return (
                <div
                  key={workout.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 transition-all shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info & Distribution */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between sm:justify-start gap-3 mb-1">
                        <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                          {workout.name}
                        </h2>
                      </div>

                      {workout.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mb-3.5">
                          {workout.description}
                        </p>
                      )}

                      {/* Mini Effort Distribution Bar */}
                      <div className="space-y-2 max-w-md">
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5 border border-slate-800/80">
                          {summary.pctWarmup > 0 && (
                            <div
                              style={{ width: `${summary.pctWarmup}%` }}
                              className="h-full bg-amber-500 rounded-full"
                            />
                          )}
                          {summary.pctHighIntensity > 0 && (
                            <div
                              style={{ width: `${summary.pctHighIntensity}%` }}
                              className="h-full bg-rose-500 rounded-full"
                            />
                          )}
                          {summary.pctLowIntensity > 0 && (
                            <div
                              style={{ width: `${summary.pctLowIntensity}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          )}
                          {summary.pctRest > 0 && (
                            <div
                              style={{ width: `${summary.pctRest}%` }}
                              className="h-full bg-slate-600 rounded-full"
                            />
                          )}
                        </div>

                        {/* Clean Metadata Line with Typographic Separators */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="font-bold text-white font-mono tabular-nums">
                            {summary.formattedTotalTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {summary.formattedHighIntensity} de esforço intenso
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {summary.totalStepsCount} etapas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 justify-end">
                      {isDeleting ? (
                        <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 rounded-xl p-1.5">
                          <span className="text-xs text-rose-300 px-2 font-medium">Excluir?</span>
                          <button
                            onClick={() => {
                              onDeleteWorkout(workout.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onDuplicateWorkout(workout.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Duplicar treino"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditWorkout(workout)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar treino"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(workout.id)}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Excluir treino"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onSelectWorkout(workout)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-all active:scale-95 shadow-md shadow-emerald-500/15 cursor-pointer ml-1"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Iniciar</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
