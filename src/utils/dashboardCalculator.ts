import {
  DashboardSummary,
  FlattenedStep,
  Workout,
  WorkoutItem,
  PHASE_CONFIGS,
} from '../types/workout';

export function formatTimeDisplay(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimeSummaryHuman(totalSeconds: number): string {
  if (totalSeconds === 0) return '0 min';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins} min`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Calculates real-time workout dashboard metrics from workout items.
 * Corresponds to Android Kotlin calculateWorkoutDashboard() function.
 */
export function calculateWorkoutDashboard(items: WorkoutItem[]): DashboardSummary {
  let warmupSeconds = 0;
  let highIntensitySeconds = 0;
  let lowIntensitySeconds = 0;
  let restSeconds = 0;
  let totalRepetitionsCount = 0;
  let totalStepsCount = 0;

  for (const item of items) {
    if (item.type === 'single') {
      const step = item.step;
      const duration = Math.max(0, step.durationSeconds || 0);
      totalStepsCount += 1;

      switch (PHASE_CONFIGS[step.phase]?.category) {
        case 'warmup':
          warmupSeconds += duration;
          break;
        case 'high':
          highIntensitySeconds += duration;
          break;
        case 'low':
          lowIntensitySeconds += duration;
          break;
        case 'rest':
          restSeconds += duration;
          break;
      }
    } else if (item.type === 'block') {
      const block = item.block;
      const reps = Math.max(1, block.repetitions || 1);
      totalRepetitionsCount += reps;

      for (const step of block.steps) {
        const stepTotalDuration = Math.max(0, step.durationSeconds || 0) * reps;
        totalStepsCount += reps;

        switch (PHASE_CONFIGS[step.phase]?.category) {
          case 'warmup':
            warmupSeconds += stepTotalDuration;
            break;
          case 'high':
            highIntensitySeconds += stepTotalDuration;
            break;
          case 'low':
            lowIntensitySeconds += stepTotalDuration;
            break;
          case 'rest':
            restSeconds += stepTotalDuration;
            break;
        }
      }
    }
  }

  const totalSeconds = warmupSeconds + highIntensitySeconds + lowIntensitySeconds + restSeconds;

  const pctWarmup = totalSeconds > 0 ? (warmupSeconds / totalSeconds) * 100 : 0;
  const pctHighIntensity = totalSeconds > 0 ? (highIntensitySeconds / totalSeconds) * 100 : 0;
  const pctLowIntensity = totalSeconds > 0 ? (lowIntensitySeconds / totalSeconds) * 100 : 0;
  const pctRest = totalSeconds > 0 ? (restSeconds / totalSeconds) * 100 : 0;

  return {
    totalSeconds,
    formattedTotalTime: formatTimeSummaryHuman(totalSeconds),
    totalStepsCount,
    warmupSeconds,
    highIntensitySeconds,
    lowIntensitySeconds,
    restSeconds,
    formattedWarmup: formatTimeSummaryHuman(warmupSeconds),
    formattedHighIntensity: formatTimeSummaryHuman(highIntensitySeconds),
    formattedLowIntensity: formatTimeSummaryHuman(lowIntensitySeconds),
    formattedRest: formatTimeSummaryHuman(restSeconds),
    pctWarmup,
    pctHighIntensity,
    pctLowIntensity,
    pctRest,
    totalRepetitionsCount,
  };
}

/**
 * Expands workout items into sequential list of executable steps for the runner engine.
 * Repeat blocks (e.g. 4x [Tiro, Trote]) are unrolled into individual chronological steps.
 */
export function flattenWorkoutSteps(workout: Workout): FlattenedStep[] {
  const rawList: Omit<FlattenedStep, 'stepIndexInFlattened' | 'totalFlattenedSteps'>[] = [];

  for (const item of workout.items) {
    if (item.type === 'single') {
      rawList.push({
        originalStepId: item.step.id,
        phase: item.step.phase,
        durationSeconds: item.step.durationSeconds,
      });
    } else if (item.type === 'block') {
      const block = item.block;
      const reps = Math.max(1, block.repetitions || 1);

      for (let rep = 1; rep <= reps; rep++) {
        for (const step of block.steps) {
          rawList.push({
            originalStepId: step.id,
            phase: step.phase,
            durationSeconds: step.durationSeconds,
            blockRepetitionIndex: rep,
            totalBlockRepetitions: reps,
            blockName: block.name || `Série (${reps}x)`,
          });
        }
      }
    }
  }

  const total = rawList.length;
  return rawList.map((item, idx) => ({
    ...item,
    stepIndexInFlattened: idx,
    totalFlattenedSteps: total,
  }));
}
