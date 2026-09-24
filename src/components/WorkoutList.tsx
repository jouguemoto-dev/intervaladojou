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
  Zap,
  Layers,
  Sparkles,
  Flame,
  Activity,
  RotateCcw,
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-slate-900/80 border-b border-slate-800 p-4 sm:p-6 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-wider">
                Android Jetpack Compose & Kotlin
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Treinos de Corrida Intervalada
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Treinos totalmente personalizáveis com cálculo automático de tempo e alertas por voz.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Treino</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content List */}
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-4 flex-1">
        {workouts.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 max-w-md mx-auto">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white">Nenhum treino cadastrado</h3>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Crie seu primeiro treino personalizado ou restaure os modelos pré-definidos de exemplo.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onCreateNew}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
              >
                Criar Treino do Zero
              </button>
              <button
                onClick={onResetDefaults}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Restaurar Modelos de Exemplo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
              <span>MEUS TREINOS SALVOS ({workouts.length})</span>
              <button
                onClick={onResetDefaults}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                title="Restaura treinos padrão"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar modelos</span>
              </button>
            </div>

            {workouts.map((workout) => {
              const summary = calculateWorkoutDashboard(workout.items);
              const isDeleting = deleteConfirmId === workout.id;

              return (
                <div
                  key={workout.id}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 transition-all shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Info & Breakdown */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {workout.name}
                        </h2>
                      </div>

                      {workout.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 mb-3">
                          {workout.description}
                        </p>
                      )}

                      {/* Mini Effort Distribution Bar */}
                      <div className="space-y-1.5 max-w-md">
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-800">
                          {summary.pctWarmup > 0 && (
                            <div
                              style={{ width: `${summary.pctWarmup}%` }}
                              className="h-full bg-amber-500 rounded-l-full"
                              title={`Aquecimento: ${summary.formattedWarmup}`}
                            />
                          )}
                          {summary.pctHighIntensity > 0 && (
                            <div
                              style={{ width: `${summary.pctHighIntensity}%` }}
                              className="h-full bg-rose-600"
                              title={`Tiro Forte: ${summary.formattedHighIntensity}`}
                            />
                          )}
                          {summary.pctLowIntensity > 0 && (
                            <div
                              style={{ width: `${summary.pctLowIntensity}%` }}
                              className="h-full bg-emerald-500"
                              title={`Trote: ${summary.formattedLowIntensity}`}
                            />
                          )}
                          {summary.pctRest > 0 && (
                            <div
                              style={{ width: `${summary.pctRest}%` }}
                              className="h-full bg-slate-600 rounded-r-full"
                              title={`Descanso: ${summary.formattedRest}`}
                            />
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2.5 text-xs">
                          <span className="flex items-center gap-1 font-bold text-white">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            {summary.formattedTotalTime}
                          </span>

                          <span className="text-slate-600">•</span>

                          <span className="flex items-center gap-1 text-rose-300 font-semibold">
                            <Zap className="w-3.5 h-3.5 text-rose-500" />
                            {summary.formattedHighIntensity} Alta Intensidade
                          </span>

                          <span className="text-slate-600">•</span>

                          <span className="flex items-center gap-1 text-slate-400">
                            <Layers className="w-3.5 h-3.5 text-blue-400" />
                            {summary.totalStepsCount} etapas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      {isDeleting ? (
                        <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 rounded-xl p-1.5">
                          <span className="text-xs text-rose-300 px-2 font-medium">Excluir?</span>
                          <button
                            onClick={() => {
                              onDeleteWorkout(workout.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => onDuplicateWorkout(workout.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Duplicar treino"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditWorkout(workout)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Editar treino"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(workout.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Excluir treino"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onSelectWorkout(workout)}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all active:scale-95 cursor-pointer ml-1"
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
