import { Workout } from '../types/workout';
import { DEFAULT_WORKOUTS } from '../data/defaultWorkouts';

const STORAGE_KEY = 'ritmo_interval_workouts_v2';
const SEEDED_KEY = 'ritmo_interval_seeded_v2';

export function loadWorkoutsFromStorage(): Workout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const hasBeenSeeded = localStorage.getItem(SEEDED_KEY);

    // Initial first-time launch only
    if (raw === null && !hasBeenSeeded) {
      saveWorkoutsToStorage(DEFAULT_WORKOUTS);
      localStorage.setItem(SEEDED_KEY, 'true');
      return DEFAULT_WORKOUTS;
    }

    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Return array even if empty (user intentionally deleted workouts)
        return parsed;
      }
    }
    return [];
  } catch (err) {
    console.error('Error loading workouts from localStorage:', err);
    return [];
  }
}

export function saveWorkoutsToStorage(workouts: Workout[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
    localStorage.setItem(SEEDED_KEY, 'true');
  } catch (err) {
    console.error('Failed to save workouts to localStorage', err);
  }
}

export function saveSingleWorkout(workout: Workout): Workout[] {
  const existing = loadWorkoutsFromStorage();
  const index = existing.findIndex((w) => w.id === workout.id);
  let updated: Workout[];

  const withTimestamps: Workout = {
    ...workout,
    updatedAt: Date.now(),
  };

  if (index >= 0) {
    updated = [...existing];
    updated[index] = withTimestamps;
  } else {
    updated = [withTimestamps, ...existing];
  }

  saveWorkoutsToStorage(updated);
  return updated;
}

export function deleteWorkoutById(id: string): Workout[] {
  const existing = loadWorkoutsFromStorage();
  const updated = existing.filter((w) => w.id !== id);
  saveWorkoutsToStorage(updated);
  return updated;
}

export function duplicateWorkoutById(id: string): Workout[] {
  const existing = loadWorkoutsFromStorage();
  const target = existing.find((w) => w.id === id);
  if (!target) return existing;

  const cloned: Workout = {
    ...JSON.parse(JSON.stringify(target)),
    id: `workout_${Date.now()}`,
    name: `${target.name} (Cópia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updated = [cloned, ...existing];
  saveWorkoutsToStorage(updated);
  return updated;
}

export function resetToDefaults(): Workout[] {
  saveWorkoutsToStorage(DEFAULT_WORKOUTS);
  return DEFAULT_WORKOUTS;
}

const LOCAL_PROFILE_KEY = 'ritmo_interval_local_profile';
const LOCAL_RUNS_KEY = 'ritmo_interval_local_runs';

export function loadLocalProfile(): any {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    userId: 'local_athlete',
    email: 'local@atleta.com',
    displayName: 'Atleta (Modo Local)',
    soundProfile: 'whistle',
    volumeBoost: 1.0,
    ttsEnabled: true,
    beepsEnabled: true,
    vibrationEnabled: true,
    weeklyGoalKm: 15,
    runningLevel: 'intermediario',
    weightKg: 70,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function saveLocalProfile(data: any): any {
  try {
    const current = loadLocalProfile();
    const updated = { ...current, ...data, updatedAt: Date.now() };
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error(e);
    return data;
  }
}

export function loadLocalRunHistory(): any[] {
  try {
    const raw = localStorage.getItem(LOCAL_RUNS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveLocalRun(run: any): any[] {
  try {
    const history = loadLocalRunHistory();
    const updated = [run, ...history];
    localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export function deleteLocalRun(runId: string): any[] {
  try {
    const history = loadLocalRunHistory().filter((r: any) => r.id !== runId);
    localStorage.setItem(LOCAL_RUNS_KEY, JSON.stringify(history));
    return history;
  } catch (e) {
    console.error(e);
    return [];
  }
}

export interface DailyGoalConfig {
  type: 'time' | 'steps';
  targetMinutes: number; // e.g. 30 min
  targetSteps: number;   // e.g. 10 séries
}

const DAILY_GOAL_CONFIG_KEY = 'ritmo_interval_daily_goal_config_v1';

export function loadDailyGoalConfig(): DailyGoalConfig {
  try {
    const raw = localStorage.getItem(DAILY_GOAL_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return {
    type: 'time',
    targetMinutes: 30,
    targetSteps: 8,
  };
}

export function saveDailyGoalConfig(config: DailyGoalConfig): void {
  try {
    localStorage.setItem(DAILY_GOAL_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error(e);
  }
}

export interface ActiveWorkoutSessionState {
  workoutId: string;
  workout: Workout;
  currentStepIndex: number;
  workoutStartTime: number;
  stepStartTime: number;
  totalPausedMs: number;
  stepPausedMs: number;
  pausedAt: number | null;
  isPaused: boolean;
  caloriesBurned: number;
  updatedAt: number;
}

const ACTIVE_WORKOUT_SESSION_KEY = 'ritmo_interval_active_workout_session_v1';

export function saveActiveWorkoutSession(session: ActiveWorkoutSessionState): void {
  try {
    localStorage.setItem(ACTIVE_WORKOUT_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save active workout session:', err);
  }
}

export function loadActiveWorkoutSession(): ActiveWorkoutSessionState | null {
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ignore stale sessions older than 12 hours
    if (parsed && typeof parsed === 'object' && Date.now() - (parsed.updatedAt || 0) < 12 * 3600 * 1000) {
      return parsed as ActiveWorkoutSessionState;
    }
    clearActiveWorkoutSession();
    return null;
  } catch (err) {
    console.error('Failed to load active workout session:', err);
    return null;
  }
}

export function clearActiveWorkoutSession(): void {
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
  } catch (err) {
    console.error('Failed to clear active workout session:', err);
  }
}


