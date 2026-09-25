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
