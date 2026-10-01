import React, { useState, useEffect } from 'react';
import {
  loadDailyGoalConfig,
  saveDailyGoalConfig,
  DailyGoalConfig,
  loadLocalRunHistory,
} from '../services/storage';
import { db, ensureActiveAuth, RunHistoryItem, AthleteProfile } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import {
  Target,
  Flame,
  Clock,
  Zap,
  CheckCircle,
  Settings2,
  TrendingUp,
  Award,
} from 'lucide-react';

export const DailyGoalCard: React.FC = () => {
  const { themeConfig } = useTheme();
  const [goalConfig, setGoalConfig] = useState<DailyGoalConfig>(() => loadDailyGoalConfig());
  const [isEditing, setIsEditing] = useState(false);
  const [targetVal, setTargetVal] = useState<number>(
    goalConfig.type === 'time' ? goalConfig.targetMinutes : goalConfig.targetSteps
  );

  // Today's aggregated progress
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [todayRunsCount, setTodayRunsCount] = useState(0);
  const [todayCalories, setTodayCalories] = useState(0);

  // Calculate start of today in local time
  const getStartOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  useEffect(() => {
    const startOfToday = getStartOfToday();

    // 1. Compute from local runs initially
    const computeFromList = (list: RunHistoryItem[]) => {
      const todayList = list.filter((r) => r.completedAt >= startOfToday);
      const secs = todayList.reduce((acc, r) => acc + (r.totalElapsedSeconds || 0), 0);
      const stps = todayList.reduce((acc, r) => acc + (r.stepsCompleted || 0), 0);
      const cals = todayList.reduce((acc, r) => acc + (r.caloriesBurned || Math.round((r.distanceMeters / 1000) * 70 * 1.036) || 0), 0);
      setTodaySeconds(secs);
      setTodaySteps(stps);
      setTodayRunsCount(todayList.length);
      setTodayCalories(cals);
    };

    const localRuns = loadLocalRunHistory();
    computeFromList(localRuns);

    // 2. Also listen to Firestore today's runs and load profile goal config for multi-device sync
    let unsubscribe: (() => void) | null = null;
    ensureActiveAuth().then(async (user) => {
      if (user) {
        try {
          // Sync profile goal if present in Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const snapProfile = await getDoc(userDocRef);
          if (snapProfile.exists()) {
            const data = snapProfile.data() as AthleteProfile;
            if (data.dailyGoal) {
              setGoalConfig(data.dailyGoal);
              saveDailyGoalConfig(data.dailyGoal);
            }
          }

          const runsRef = collection(db, 'users', user.uid, 'runs');
          const q = query(runsRef, where('completedAt', '>=', startOfToday));
          unsubscribe = onSnapshot(q, (snap) => {
            const cloudRuns: RunHistoryItem[] = [];
            snap.forEach((doc) => {
              cloudRuns.push({ id: doc.id, ...(doc.data() as any) });
            });

            // Merge unique with local
            const local = loadLocalRunHistory();
            const map = new Map<string, RunHistoryItem>();
            cloudRuns.forEach((r) => map.set(r.id, r));
            local.forEach((r) => {
              if (!map.has(r.id)) map.set(r.id, r);
            });
            computeFromList(Array.from(map.values()));
          }, () => {
            // Fallback to local
          });
        } catch {
          // Fallback
        }
      }
    }).catch(() => {});

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const todayMinutes = Math.floor(todaySeconds / 60);

  const currentVal = goalConfig.type === 'time' ? todayMinutes : todaySteps;
  const target = goalConfig.type === 'time' ? goalConfig.targetMinutes : goalConfig.targetSteps;
  const progressPct = Math.min(100, Math.round((currentVal / Math.max(1, target)) * 100));
  const isGoalReached = currentVal >= target;

  const handleSaveGoal = () => {
    const updated: DailyGoalConfig = {
      ...goalConfig,
      targetMinutes: goalConfig.type === 'time' ? targetVal : goalConfig.targetMinutes,
      targetSteps: goalConfig.type === 'steps' ? targetVal : goalConfig.targetSteps,
    };
    setGoalConfig(updated);
    saveDailyGoalConfig(updated);
    setIsEditing(false);

    // Save to Firestore user profile as well
    ensureActiveAuth().then((user) => {
      if (user) {
        setDoc(doc(db, 'users', user.uid), { dailyGoal: updated, updatedAt: Date.now() }, { merge: true }).catch(console.error);
      }
    }).catch(() => {});
  };

  const handleSwitchType = (type: 'time' | 'steps') => {
    const updated: DailyGoalConfig = {
      ...goalConfig,
      type,
    };
    setGoalConfig(updated);
    setTargetVal(type === 'time' ? updated.targetMinutes : updated.targetSteps);
    saveDailyGoalConfig(updated);

    // Save to Firestore user profile as well
    ensureActiveAuth().then((user) => {
      if (user) {
        setDoc(doc(db, 'users', user.uid), { dailyGoal: updated, updatedAt: Date.now() }, { merge: true }).catch(console.error);
      }
    }).catch(() => {});
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm relative overflow-hidden transition-all">
      {/* Background Glow when Goal Reached */}
      {isGoalReached && (
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg border ${
              isGoalReached
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}
          >
            {isGoalReached ? <Award className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Meta Diária
              </h3>
              {isGoalReached && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                  <CheckCircle className="w-2.5 h-2.5" />
                  Concluída!
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {goalConfig.type === 'time'
                ? `Alvo de ${goalConfig.targetMinutes} min de corrida diária`
                : `Alvo de ${goalConfig.targetSteps} séries de tiro/trote`}
            </p>
          </div>
        </div>

        {/* Adjust Goal button */}
        <button
          onClick={() => {
            setTargetVal(goalConfig.type === 'time' ? goalConfig.targetMinutes : goalConfig.targetSteps);
            setIsEditing(!isEditing);
          }}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs"
          title="Ajustar Meta Diária"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline Goal Editing Drawer */}
      {isEditing && (
        <div className="mb-3 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleSwitchType('time')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                goalConfig.type === 'time'
                  ? 'bg-slate-800 border border-white/20 text-white'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Tempo (Minutos)
            </button>
            <button
              onClick={() => handleSwitchType('steps')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all ${
                goalConfig.type === 'steps'
                  ? 'bg-slate-800 border border-white/20 text-white'
                  : 'bg-transparent text-slate-400 hover:text-white'
              }`}
            >
              Quantidade de Séries
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-300 font-semibold whitespace-nowrap">
              {goalConfig.type === 'time' ? 'Minutos:' : 'Séries:'}
            </span>
            <input
              type="number"
              min={goalConfig.type === 'time' ? 5 : 2}
              max={goalConfig.type === 'time' ? 180 : 50}
              value={targetVal}
              onChange={(e) => setTargetVal(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-extrabold text-white text-center focus:outline-none focus:border-cyan-400"
            />
            <button
              onClick={handleSaveGoal}
              className={`flex-1 py-1 rounded-lg text-xs font-bold ${themeConfig.buttonPrimary}`}
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Visual Metric & Percentage */}
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-black text-white font-mono tracking-tight">
            {goalConfig.type === 'time' ? `${todayMinutes}m` : `${todaySteps}`}
          </span>
          <span className="text-[11px] font-bold text-slate-500">
            / {target} {goalConfig.type === 'time' ? 'min' : 'séries'}
          </span>
        </div>

        <div className="text-right">
          <span
            className={`text-xs font-extrabold font-mono ${
              isGoalReached ? 'text-emerald-400' : themeConfig.accentText
            }`}
          >
            {progressPct}%
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full bg-slate-950 rounded-full h-2.5 p-0.5 border border-slate-800/90 overflow-hidden shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isGoalReached
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Subtext info with Today's Calories */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-medium">
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-400" />
          <span>
            {todayRunsCount === 0
              ? 'Nenhum treino hoje'
              : `${todayRunsCount} treino${todayRunsCount > 1 ? 's' : ''} (${todayCalories} kcal)`}
          </span>
        </span>

        {isGoalReached ? (
          <span className="text-emerald-400 font-bold">Parabéns! 🔥</span>
        ) : (
          <span>Faltam {Math.max(0, target - currentVal)} {goalConfig.type === 'time' ? 'min' : 'séries'}</span>
        )}
      </div>
    </div>
  );
};
