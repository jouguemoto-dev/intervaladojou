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
  Flame,
  Zap,
  Activity,
  Footprints,
  Coffee,
  Copy,
  Info,
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
    initialWorkout?.description || 'Treino intervalado personalizado com fases ajustadas.'
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

  // Compute live dashboard metrics in real time
  const dashboard = calculateWorkoutDashboard(items);

  // Helper to get icon for phase
  const getPhaseIcon = (phase: PhaseType, size = 'w-4 h-4') => {
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

  // Add single step
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

  // Add interval pair block (e.g. 4x Tiro 40s + Trote 50s)
  const addIntervalBlock = (reps = 4, sprint = 40, recovery = 50) => {
    const newBlock: WorkoutItem = {
      type: 'block',
      block: {
        id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: `Série Intervalada (${reps}x)`,
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

  // Update single step duration
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

  // Set exact single step duration
  const setExactSingleStepDuration = (itemIndex: number, seconds: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'single') {
        copy[itemIndex] = {
          ...item,
          step: { ...item.step, durationSeconds: Math.max(5, seconds) },
        };
      }
      return copy;
    });
  };

  // Change single step phase
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

  // Update block repetition count
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

  // Update a step inside a block
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

  // Change step phase inside block
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

  // Add a step inside an existing block
  const addStepToBlock = (itemIndex: number, phase: PhaseType = 'low_intensity') => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        const newSubStep: WorkoutStep = {
          id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          phase,
          durationSeconds: 45,
          notes: '',
        };
        copy[itemIndex] = {
          ...item,
          block: { ...item.block, steps: [...item.block.steps, newSubStep] },
        };
      }
      return copy;
    });
  };

  // Remove a step inside block
  const removeStepFromBlock = (itemIndex: number, stepIndex: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = copy[itemIndex];
      if (item && item.type === 'block') {
        if (item.block.steps.length <= 1) {
          // If only 1 step left, remove the whole block
          copy.splice(itemIndex, 1);
        } else {
          const stepsCopy = [...item.block.steps];
          stepsCopy.splice(stepIndex, 1);
          copy[itemIndex] = {
            ...item,
            block: { ...item.block, steps: stepsCopy },
          };
        }
      }
      return copy;
    });
  };

  // Move item up / down
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

  // Duplicate item
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

  // Delete item
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
    onSave(handleBuildWorkoutObject());
  };

  const handleSaveAndStart = () => {
    const workout = handleBuildWorkoutObject();
    onSave(workout);
    onStart(workout);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              {initialWorkout ? 'Editar Treino' : 'Criar Novo Treino'}
            </h1>
            <p className="text-[11px] text-slate-400">Personalize etapas e repetições</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveOnly}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <Save className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Salvar</span>
          </button>

          <button
            onClick={handleSaveAndStart}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Iniciar Corrida</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6">
        {/* Workout Details (Name & Description) */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome do Treino
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Treino Pirâmide, Tiros de 40s/50s"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Objetivo / Notas (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Foco em VO2 Máx com tiros curtos e recuperação ativa"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* REAL-TIME DASHBOARD COMPONENT */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              Dashboard em Tempo Real
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">
              Atualiza automaticamente
            </span>
          </div>
          <DashboardCard dashboard={dashboard} />
        </div>

        {/* Quick Add Presets Bar */}
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Adicionar Rápido ao Treino:
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => addIntervalBlock(4, 40, 50)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Bloco 4x (40s / 50s)</span>
            </button>
            <button
              onClick={() => addSingleStep('warmup', 300)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>+ Aquecimento 5m</span>
            </button>
            <button
              onClick={() => addSingleStep('high_intensity', 60)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>+ Tiro 1 min</span>
            </button>
            <button
              onClick={() => addSingleStep('low_intensity', 60)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>+ Trote 1 min</span>
            </button>
            <button
              onClick={() => addSingleStep('walk', 180)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+ Caminhada 3m</span>
            </button>
            <button
              onClick={() => addSingleStep('rest', 60)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>+ Descanso 1m</span>
            </button>
          </div>
        </div>

        {/* Sequential Workout Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sequência de Fases ({items.length} itens montados)
            </span>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-300">Nenhuma etapa adicionada</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Adicione etapas individuais ou blocos com repetições usando os botões abaixo para montar seu treino.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, itemIdx) => {
                if (item.type === 'single') {
                  const cfg = PHASE_CONFIGS[item.step.phase];
                  return (
                    <div
                      key={item.step.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Phase Selector & Info */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-mono font-bold text-slate-500 w-5">
                            #{itemIdx + 1}
                          </span>
                          
                          <div className={`p-2 rounded-xl bg-gradient-to-br ${cfg.colorBg} text-white shadow-md`}>
                            {getPhaseIcon(item.step.phase, 'w-5 h-5')}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <select
                                value={item.step.phase}
                                onChange={(e) => updateSingleStepPhase(itemIdx, e.target.value as PhaseType)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                {Object.values(PHASE_CONFIGS).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[11px] text-slate-400 hidden sm:inline">
                                ({cfg.description})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Duration Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
                            <button
                              onClick={() => updateSingleStepDuration(itemIdx, -10)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                              title="-10s"
                            >
                              -10
                            </button>
                            <span className="px-2 font-mono font-bold text-sm text-emerald-400 min-w-[54px] text-center">
                              {formatTimeDisplay(item.step.durationSeconds)}
                            </span>
                            <button
                              onClick={() => updateSingleStepDuration(itemIdx, 10)}
                              className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                              title="+10s"
                            >
                              +10
                            </button>
                          </div>

                          {/* Quick Add presets */}
                          <div className="hidden sm:flex gap-1">
                            <button
                              onClick={() => updateSingleStepDuration(itemIdx, 30)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded-lg"
                            >
                              +30s
                            </button>
                            <button
                              onClick={() => updateSingleStepDuration(itemIdx, 60)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 rounded-lg"
                            >
                              +1m
                            </button>
                          </div>

                          {/* Action icons */}
                          <div className="flex items-center gap-0.5 border-l border-slate-800 pl-2">
                            <button
                              onClick={() => moveItem(itemIdx, 'up')}
                              disabled={itemIdx === 0}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveItem(itemIdx, 'down')}
                              disabled={itemIdx === items.length - 1}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => duplicateItem(itemIdx)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800"
                              title="Duplicar etapa"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteItem(itemIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
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
                  // Workout Block (e.g. 4x [Tiro 40s + Trote 50s])
                  const block = item.block;
                  return (
                    <div
                      key={block.id}
                      className="bg-slate-900/90 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-lg transition-all"
                    >
                      {/* Block Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-indigo-500/20">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-500 w-5">
                            #{itemIdx + 1}
                          </span>
                          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                            <Repeat className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-indigo-200">
                              {block.name || 'Bloco Intervalado'}
                            </span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              (Executa {block.repetitions} vezes em sequência)
                            </span>
                          </div>
                        </div>

                        {/* Repetition Stepper */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-indigo-950/80 border border-indigo-500/40 rounded-xl px-2 py-1">
                            <span className="text-xs font-semibold text-indigo-300 mr-2">Repetições:</span>
                            <button
                              onClick={() => updateBlockRepetitions(itemIdx, -1)}
                              className="w-6 h-6 flex items-center justify-center text-indigo-300 hover:text-white rounded hover:bg-indigo-900 text-sm font-bold"
                            >
                              -
                            </button>
                            <span className="px-2 font-bold text-sm text-white min-w-[28px] text-center">
                              {block.repetitions}x
                            </span>
                            <button
                              onClick={() => updateBlockRepetitions(itemIdx, 1)}
                              className="w-6 h-6 flex items-center justify-center text-indigo-300 hover:text-white rounded hover:bg-indigo-900 text-sm font-bold"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Reps */}
                          <div className="hidden sm:flex gap-1">
                            {[3, 4, 6, 8].map((r) => (
                              <button
                                key={r}
                                onClick={() => {
                                  const copy = [...items];
                                  const cur = copy[itemIdx];
                                  if (cur.type === 'block') {
                                    copy[itemIdx] = {
                                      ...cur,
                                      block: { ...cur.block, repetitions: r },
                                    };
                                    setItems(copy);
                                  }
                                }}
                                className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  block.repetitions === r
                                    ? 'bg-indigo-600 text-white border-indigo-400'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                }`}
                              >
                                {r}x
                              </button>
                            ))}
                          </div>

                          {/* Block Actions */}
                          <div className="flex items-center gap-0.5 border-l border-slate-800 pl-2">
                            <button
                              onClick={() => moveItem(itemIdx, 'up')}
                              disabled={itemIdx === 0}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                              title="Mover para cima"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveItem(itemIdx, 'down')}
                              disabled={itemIdx === items.length - 1}
                              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-800"
                              title="Mover para baixo"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => duplicateItem(itemIdx)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 rounded hover:bg-slate-800"
                              title="Duplicar bloco"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteItem(itemIdx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                              title="Excluir bloco"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Steps inside the block */}
                      <div className="space-y-2 pl-3 sm:pl-6 border-l-2 border-indigo-500/30">
                        {block.steps.map((subStep, stepIdx) => {
                          const subCfg = PHASE_CONFIGS[subStep.phase];
                          return (
                            <div
                              key={subStep.id}
                              className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`p-1.5 rounded-lg bg-gradient-to-br ${subCfg.colorBg} text-white`}>
                                  {getPhaseIcon(subStep.phase, 'w-3.5 h-3.5')}
                                </div>
                                <select
                                  value={subStep.phase}
                                  onChange={(e) =>
                                    updateBlockStepPhase(itemIdx, stepIdx, e.target.value as PhaseType)
                                  }
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none cursor-pointer"
                                >
                                  {Object.values(PHASE_CONFIGS).map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2 py-1">
                                  <button
                                    onClick={() => updateBlockStepDuration(itemIdx, stepIdx, -5)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                                  >
                                    -5
                                  </button>
                                  <span className="px-2 font-mono font-bold text-xs text-white min-w-[48px] text-center">
                                    {formatTimeDisplay(subStep.durationSeconds)}
                                  </span>
                                  <button
                                    onClick={() => updateBlockStepDuration(itemIdx, stepIdx, 5)}
                                    className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                                  >
                                    +5
                                  </button>
                                </div>

                                <button
                                  onClick={() => removeStepFromBlock(itemIdx, stepIdx)}
                                  className="p-1 text-slate-500 hover:text-rose-400 rounded"
                                  title="Remover etapa do bloco"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Add step to block */}
                        <div className="pt-1 flex gap-2">
                          <button
                            onClick={() => addStepToBlock(itemIdx, 'high_intensity')}
                            className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20"
                          >
                            <Plus className="w-3 h-3" /> + Tiro
                          </button>
                          <button
                            onClick={() => addStepToBlock(itemIdx, 'low_intensity')}
                            className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                          >
                            <Plus className="w-3 h-3" /> + Trote
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

        {/* Bottom Add Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => addSingleStep('high_intensity', 45)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-semibold text-xs hover:bg-slate-850 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Adicionar Etapa Avulsa</span>
          </button>

          <button
            onClick={() => addIntervalBlock(4, 40, 50)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 hover:border-indigo-400 text-indigo-200 font-bold text-xs hover:bg-indigo-900/50 transition-all shadow-sm"
          >
            <Repeat className="w-4 h-4 text-indigo-400" />
            <span>Adicionar Bloco com Repetições (4x)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
