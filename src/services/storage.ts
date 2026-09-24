import { Workout } from '../types/workout';
import { DEFAULT_WORKOUTS } from '../data/defaultWorkouts';

const STORAGE_KEY = 'ritmo_interval_workouts_v1';

export function loadWorkoutsFromStorage(): Workout[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveWorkoutsToStorage(DEFAULT_WORKOUTS);
      return DEFAULT_WORKOUTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_WORKOUTS;
  } catch {
    return DEFAULT_WORKOUTS;
  }
}

export function saveWorkoutsToStorage(workouts: Workout[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
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
