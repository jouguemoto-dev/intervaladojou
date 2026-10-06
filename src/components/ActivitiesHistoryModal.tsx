import React, { useState, useEffect } from 'react';
import {
  auth,
  ensureActiveAuth,
  db,
  RunHistoryItem,
} from '../services/firebase';
import { loadLocalRunHistory, saveLocalRun, deleteLocalRun } from '../services/storage';
import { collection, query, orderBy, limit, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { formatTimeDisplay } from '../utils/dashboardCalculator';
import { useTheme } from '../context/ThemeContext';
import { RouteMiniMap } from './RouteMiniMap';
import {
  Trophy,
  History,
  X,
  Calendar,
  Clock,
  Navigation,
  Flame,
  Activity,
  Trash2,
  CheckCircle,
  MapPin,
  ChevronDown,
  ChevronUp,
  Sun,
  CloudSun,
  CloudRain,
  Thermometer,
  Zap,
} from 'lucide-react';

interface ActivitiesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivitiesHistoryModal: React.FC<ActivitiesHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { themeConfig } = useTheme();
  const [runs, setRuns] = useState<RunHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    let unsubscribeFirestore: (() => void) | null = null;

    const setupListener = async () => {
      try {
        const user = await ensureActiveAuth();
        if (user) {
          const runsRef = collection(db, 'users', user.uid, 'runs');
          const q = query(runsRef, orderBy('completedAt', 'desc'), limit(50));

          unsubscribeFirestore = onSnapshot(
            q,
            (snap) => {
              const cloudList: RunHistoryItem[] = [];
              snap.forEach((d) => {
                cloudList.push({ id: d.id, ...(d.data() as any) });
              });

              // Combine with local runs to ensure zero data loss
              const localList = loadLocalRunHistory();
              const mergedMap = new Map<string, RunHistoryItem>();

              cloudList.forEach((r) => mergedMap.set(r.id, r));
              localList.forEach((r) => {
                if (!mergedMap.has(r.id)) {
                  mergedMap.set(r.id, r);
                }
              });

              const sorted = Array.from(mergedMap.values()).sort(
                (a, b) => b.completedAt - a.completedAt
              );

              setRuns(sorted);
              setIsLoading(false);
            },
            () => {
              // Fallback to local storage if offline or permissions pending
              const localOnly = loadLocalRunHistory();
              setRuns(localOnly);
              setIsLoading(false);
            }
          );
        }
      } catch {
        const localOnly = loadLocalRunHistory();
        setRuns(localOnly);
        setIsLoading(false);
      }
    };

    setupListener();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalDistanceKm = runs.reduce((acc, r) => acc + (r.distanceMeters || 0) / 1000, 0);
  const totalSeconds = runs.reduce((acc, r) => acc + (r.totalElapsedSeconds || 0), 0);
  const totalCalories = runs.reduce((acc, r) => acc + (r.caloriesBurned || Math.round((r.distanceMeters / 1000) * 70 * 1.036) || 0), 0);

  const handleDeleteRun = async (runId: string) => {
    try {
      if (auth.currentUser) {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'runs', runId)).catch(() => {});
      }
      deleteLocalRun(runId);
      setRuns((prev) => prev.filter((r) => r.id !== runId));
      setDeleteConfirmId(null);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Atividades Concluídas
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Histórico de treinos, calorias, clima e ritmo GPS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Stats Overview (4 Cards: Treinos, Distância, Calorias, Tempo) */}
        <div className="p-4 sm:p-5 bg-slate-950/40 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              Treinos
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono">
              {runs.length}
            </span>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              Distância
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {totalDistanceKm.toFixed(1)} <span className="text-[10px] font-bold text-slate-400">km</span>
            </span>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5 flex items-center justify-center gap-1">
              <Flame className="w-3 h-3 text-orange-400 inline" />
              <span>Calorias</span>
            </span>
            <span className="text-xl sm:text-2xl font-black text-orange-400 font-mono">
              {totalCalories} <span className="text-[10px] font-bold text-slate-400">kcal</span>
            </span>
          </div>

          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
              Tempo
            </span>
            <span className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
              {formatTimeDisplay(totalSeconds)}
            </span>
          </div>
        </div>

        {/* Activities List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 font-semibold text-sm">
              Carregando histórico...
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-950/50">
              <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white">Nenhum treino concluído ainda</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Assim que você iniciar e concluir uma sessão de tiros ou corrida, ela será registrada e salva automaticamente aqui.
              </p>
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-white text-sm sm:text-base">
                        {run.workoutName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {run.stepsCompleted}/{run.totalSteps} etapas
                      </span>
                      {run.temperatureC != null && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-sky-400" />
                          <span>{run.temperatureC}°C</span>
                          {run.weatherDescription && (
                            <span className="text-slate-400 font-normal">({run.weatherDescription})</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(run.completedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(run.completedAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {deleteConfirmId === run.id ? (
                      <div className="flex items-center gap-1 bg-rose-950/40 border border-rose-500/40 rounded-xl p-1">
                        <span className="text-[11px] font-bold text-rose-300 px-1">Excluir?</span>
                        <button
                          onClick={() => handleDeleteRun(run.id)}
                          className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold"
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(run.id)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                        title="Excluir atividade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics Breakdown (4 columns: Distância, Calorias, Duração, Ritmo) */}
                <div className="mt-3 pt-3 border-t border-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Distância
                    </span>
                    <span className="text-base font-extrabold text-white font-mono">
                      {(run.distanceMeters / 1000).toFixed(2)} km
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      Calorias
                    </span>
                    <span className="text-base font-extrabold text-orange-400 font-mono">
                      {run.caloriesBurned || Math.round((run.distanceMeters / 1000) * 70 * 1.036)} kcal
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Duração
                    </span>
                    <span className="text-base font-extrabold text-cyan-400 font-mono">
                      {formatTimeDisplay(run.totalElapsedSeconds)}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Ritmo Médio
                    </span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      {run.averagePace || '--:-- /km'}
                    </span>
                  </div>
                </div>

                {/* Route Map Toggle & Display */}
                {run.gpsTrack && run.gpsTrack.length >= 2 ? (
                  <div className="mt-3 pt-2.5 border-t border-slate-900">
                    <button
                      onClick={() =>
                        setExpandedMapId(expandedMapId === run.id ? null : run.id)
                      }
                      className="w-full flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer border border-slate-800"
                    >
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          {expandedMapId === run.id
                            ? 'Ocultar Mapa de Trajeto'
                            : 'Ver Mapa de Trajeto com Tiros'}
                        </span>
                      </span>
                      {expandedMapId === run.id ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {expandedMapId === run.id && (
                      <div className="mt-2.5 animate-fade-in">
                        <RouteMiniMap trackPoints={run.gpsTrack} height={170} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 text-[10px] text-slate-500 italic flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-slate-600" />
                    <span>Treino sem pontos de GPS suficientes para traçado do mapa</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${themeConfig.buttonPrimary}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
