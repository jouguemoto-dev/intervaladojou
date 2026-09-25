import React, { useState } from 'react';
import {
  Workout,
  WorkoutItem,
  WorkoutStep,
  WorkoutBlock,
  PhaseType,
  PHASE_CONFIGS,
} from '../types/workout';
import { calculateWorkoutDashboard, formatTimeDisplay } from '../utils/dashboardCalculator';
import { DashboardCard } from './DashboardCard';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Repeat,
  Play,
  Save,
  ArrowLeft,
  Copy,
  Minus,
} from 'lucide-react';

interface WorkoutBuilderProps {
  initialWorkout?: Workout | null;
  onSave: (workout: Workout) => void;
  onStart: (workout: Workout) => void;
  onCancel: () => void;
}

export const WorkoutBuilder: React.FC<WorkoutBuilderProps> = ({
  initialWorkout,
  onSave,
  onStart,
  onCancel,
}) => {
  const [name, setName] = useState(initialWorkout?.name || 'Novo Treino Intervalado');
  const [description, setDescription] = useState(
    initialWorkout?.description || 'Treino intervalado com fases de esforço e recuperação.'
  );
  const [items, setItems] = useState<WorkoutItem[]>(
    initialWorkout?.items || [
      {
        type: 'single',
        step: {
          id: `step_${Date.now()}_1`,
          phase: 'warmup',
          durationSeconds: 300,
          notes: 'Aquecimento inicial',
        },
      },
      {
        type: 'block',
        block: {
          id: `block_${Date.now()}_2`,
          name: 'Série de Tiros',
          repetitions: 4,
          steps: [
            {
              id: `step_${Date.now()}_b1`,
              phase: 'high_intensity',
              durationSeconds: 40,
              notes: 'Tiro máximo',
            },
            {
              id: `step_${Date.now()}_b2`,
              phase: 'low_intensity',
              durationSeconds: 50,
              notes: 'Trote suave',
            },
          ],
        },
      },
      {
        type: 'single',
        step: {
          id: `step_${Date.now()}_3`,
          phase: 'walk',
          durationSeconds: 180,
          notes: 'Desaquecimento',
        },
      },
    ]
  );

  const dashboard = calculateWorkoutDashboard(items);

  const addSingleStep = (phase: PhaseType = 'high_intensity', duration = 60) => {
    const newStep: WorkoutItem = {
      type: 'single',
      step: {
        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        phase,
        durationSeconds: duration,
        notes: '',
      },
    };
    setItems((prev) => [...prev, newStep]);
  };

  const addIntervalBlock = (reps = 4, sprint = 40, recovery = 50) => {
    const newBlock: WorkoutItem = {
      type: 'block',
      block: {
        id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: 'Série Intervalada',
        repetitions: reps,
        steps: [
          {
            id: `step_sprint_${Date.now()}`,
            phase: 'high_intensity',
            durationSeconds: sprint,
            notes: 'Tiro Forte',
          },
          {
            id: `step_recov_${Date.now()}`,
            phase: 'low_intensity',
            durationSeconds: recovery,
            notes: 'Trote Fraco',
          },
        ],
      },
    };
    setItems((prev) => [...prev, newBlock]);
  };

  const updateSingleStepDuration = (itemIndex: number, deltaSeconds: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'single') {
        const nextDur = Math.max(5, item.step.durationSeconds + deltaSeconds);
        copy[itemIndex] = {
          ...item,
          step: { ...item.step, durationSeconds: nextDur },
        };
      }
      return copy;
    });
  };

  const updateSingleStepPhase = (itemIndex: number, newPhase: PhaseType) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'single') {
        copy[itemIndex] = {
          ...item,
          step: { ...item.step, phase: newPhase },
        };
      }
      return copy;
    });
  };

  const updateBlockRepetitions = (itemIndex: number, delta: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        const nextReps = Math.max(1, Math.min(50, item.block.repetitions + delta));
        copy[itemIndex] = {
          ...item,
          block: { ...item.block, repetitions: nextReps },
        };
      }
      return copy;
    });
  };

  const updateBlockStepDuration = (itemIndex: number, stepIndex: number, deltaSeconds: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        const stepsCopy = [...item.block.steps];
        const step = stepsCopy[stepIndex];
        if (step) {
          stepsCopy[stepIndex] = {
            ...step,
            durationSeconds: Math.max(5, step.durationSeconds + deltaSeconds),
          };
          copy[itemIndex] = {
            ...item,
            block: { ...item.block, steps: stepsCopy },
          };
        }
      }
      return copy;
    });
  };

  const updateBlockStepPhase = (itemIndex: number, stepIndex: number, newPhase: PhaseType) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        const stepsCopy = [...item.block.steps];
        if (stepsCopy[stepIndex]) {
          stepsCopy[stepIndex] = {
            ...stepsCopy[stepIndex],
            phase: newPhase,
          };
          copy[itemIndex] = {
            ...item,
            block: { ...item.block, steps: stepsCopy },
          };
        }
      }
      return copy;
    });
  };

  const addStepToBlock = (itemIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        const stepsCopy = [
          ...item.block.steps,
          {
            id: `sub_${Date.now()}`,
            phase: 'low_intensity' as PhaseType,
            durationSeconds: 45,
            notes: '',
          },
        ];
        copy[itemIndex] = {
          ...item,
          block: { ...item.block, steps: stepsCopy },
        };
      }
      return copy;
    });
  };

  const removeStepFromBlock = (itemIndex: number, stepIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        if (item.block.steps.length <= 1) return prev; // Keep at least 1 step
        const stepsCopy = item.block.steps.filter((_, idx) => idx !== stepIndex);
        copy[itemIndex] = {
          ...item,
          block: { ...item.block, steps: stepsCopy },
        };
      }
      return copy;
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    setItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const duplicateItem = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[index];
      const cloned = JSON.parse(JSON.stringify(item));
      if (cloned.type === 'single') {
        cloned.step.id = `step_${Date.now()}`;
      } else {
        cloned.block.id = `block_${Date.now()}`;
      }
      copy.splice(index + 1, 0, cloned);
      return copy;
    });
  };

  const deleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleBuildWorkoutObject = (): Workout => {
    return {
      id: initialWorkout?.id || `workout_${Date.now()}`,
      name: name.trim() || 'Treino Intervalado',
      description: description.trim(),
      items,
      createdAt: initialWorkout?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  };

  const handleSaveOnly = () => {
    if (items.length === 0) return;
    onSave(handleBuildWorkoutObject());
  };

  const handleSaveAndStart = () => {
    if (items.length === 0) return;
    const workout = handleBuildWorkoutObject();
    onSave(workout);
    onStart(workout);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              {initialWorkout ? 'Editar Treino' : 'Estruturar Treino'}
            </h1>
            <p className="text-[11px] text-slate-400">Monte suas etapas e repetições</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOnly}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>

          <button
            onClick={handleSaveAndStart}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-5">
        {/* Name & Notes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título do Treino
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Treino Pirâmide, Tiros 40s/50s"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Objetivo ou Observações
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Foco em potência aeróbica e recuperação ativa"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Real-Time Dashboard */}
        <DashboardCard dashboard={dashboard} />

        {/* Quick Add Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400 font-medium mr-1">Adicionar rápido:</span>
          <button
            onClick={() => addIntervalBlock(4, 40, 50)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-rose-400 transition-all active:scale-95 cursor-pointer"
          >
            + Bloco 4x (40s / 50s)
          </button>
          <button
            onClick={() => addSingleStep('warmup', 300)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            + Aquecimento 5m
          </button>
          <button
            onClick={() => addSingleStep('high_intensity', 60)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            + Tiro 1 min
          </button>
          <button
            onClick={() => addSingleStep('walk', 180)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            + Caminhada 3m
          </button>
        </div>

        {/* Steps List */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-medium">Fases em Sequência ({items.length})</span>
          </div>

          {items.map((item, itemIdx) => {
            if (item.type === 'single') {
              const cfg = PHASE_CONFIGS[item.step.phase];
              return (
                <div
                  key={item.step.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Phase Selector */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-500 w-5">
                        {itemIdx + 1}.
                      </span>

                      <div className="flex-1 min-w-0">
                        <select
                          value={item.step.phase}
                          onChange={(e) => updateSingleStepPhase(itemIdx, e.target.value as PhaseType)}
                          className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {Object.values(PHASE_CONFIGS).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Stepper with >= 44px touch ergonomics */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl">
                        <button
                          onClick={() => updateSingleStepDuration(itemIdx, -15)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-l-xl hover:bg-slate-800 transition-colors cursor-pointer"
                          title="-15s"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3 font-mono font-bold text-sm text-white min-w-[60px] text-center tabular-nums">
                          {formatTimeDisplay(item.step.durationSeconds)}
                        </span>
                        <button
                          onClick={() => updateSingleStepDuration(itemIdx, 15)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-r-xl hover:bg-slate-800 transition-colors cursor-pointer"
                          title="+15s"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Reorder & Delete */}
                      <div className="flex items-center gap-0.5 pl-1">
                        <button
                          onClick={() => moveItem(itemIdx, 'up')}
                          disabled={itemIdx === 0}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Mover acima"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItem(itemIdx, 'down')}
                          disabled={itemIdx === items.length - 1}
                          className="p-2 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Mover abaixo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicateItem(itemIdx)}
                          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Duplicar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteItem(itemIdx)}
                          className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Block Grouping
              const block = item.block;
              return (
                <div
                  key={block.id}
                  className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  {/* Block Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-bold text-white">
                        Série Intervalada
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl">
                        <button
                          onClick={() => updateBlockRepetitions(itemIdx, -1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                          title="Menos repetições"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 font-bold text-xs text-white tabular-nums">
                          {block.repetitions}x
                        </span>
                        <button
                          onClick={() => updateBlockRepetitions(itemIdx, 1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                          title="Mais repetições"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Block Level Controls */}
                      <button
                        onClick={() => moveItem(itemIdx, 'up')}
                        disabled={itemIdx === 0}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Mover bloco para cima"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => moveItem(itemIdx, 'down')}
                        disabled={itemIdx === items.length - 1}
                        className="p-2 text-slate-400 hover:text-white disabled:opacity-20 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Mover bloco para baixo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => duplicateItem(itemIdx)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Duplicar série inteira"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteItem(itemIdx)}
                        className="p-2 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
                        title="Excluir bloco"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-steps */}
                  <div className="space-y-2 pl-3 border-l-2 border-slate-800">
                    {block.steps.map((subStep, subIdx) => (
                      <div
                        key={subStep.id}
                        className="bg-slate-950 rounded-xl p-3 flex items-center justify-between gap-3 border border-slate-800/80"
                      >
                        <select
                          value={subStep.phase}
                          onChange={(e) =>
                            updateBlockStepPhase(itemIdx, subIdx, e.target.value as PhaseType)
                          }
                          className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none cursor-pointer"
                        >
                          {Object.values(PHASE_CONFIGS).map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg">
                            <button
                              onClick={() => updateBlockStepDuration(itemIdx, subIdx, -5)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 font-mono font-bold text-xs text-white tabular-nums">
                              {formatTimeDisplay(subStep.durationSeconds)}
                            </span>
                            <button
                              onClick={() => updateBlockStepDuration(itemIdx, subIdx, 5)}
                              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {block.steps.length > 1 && (
                            <button
                              onClick={() => removeStepFromBlock(itemIdx, subIdx)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg cursor-pointer"
                              title="Remover etapa desta série"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addStepToBlock(itemIdx)}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar etapa nesta série</span>
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>

        {/* Bottom Add Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => addSingleStep('high_intensity', 45)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Adicionar Fase</span>
          </button>

          <button
            onClick={() => addIntervalBlock(4, 40, 50)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
          >
            <Repeat className="w-4 h-4 text-emerald-400" />
            <span>Adicionar Série (4x)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
