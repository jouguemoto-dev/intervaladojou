import { PhaseType } from '../types/workout';

/**
 * MET (Metabolic Equivalent of Task) base values according to the
 * 2024 Adult Compendium of Physical Activities & ACSM Guidelines:
 *
 * - rest: 1.25 MET (sitting / standing still / recovery pause)
 * - walk: 3.5 MET (moderate walk ~5.0 km/h)
 * - warmup: 5.0 MET (light running / dynamic mobility jog ~6.5 - 7.5 km/h)
 * - low_intensity (trote / steady active recovery): 8.0 MET (~8.0 - 9.0 km/h)
 * - high_intensity (tiro forte / anaerobic sprint interval): 12.8 MET (~12.5 - 15.0+ km/h)
 */
export const PHASE_MET_MAP: Record<PhaseType, number> = {
  rest: 1.25,
  walk: 3.5,
  warmup: 5.0,
  low_intensity: 8.0,
  high_intensity: 12.8,
};

/**
 * Calculates continuous MET dynamically using ACSM Running Equation:
 * - Walking (< 6.0 km/h): VO2 = (0.1 * S) + 3.5  (where S is speed in m/min)
 * - Running (>= 6.0 km/h): VO2 = (0.2 * S) + 3.5
 * MET = VO2 / 3.5
 *
 * Examples:
 * - 8.0 km/h (133.3 m/min): VO2 = 30.16 -> MET = 8.6
 * - 10.0 km/h (166.7 m/min): VO2 = 36.84 -> MET = 10.5
 * - 12.0 km/h (200.0 m/min): VO2 = 43.50 -> MET = 12.4
 * - 14.0 km/h (233.3 m/min): VO2 = 50.16 -> MET = 14.3
 * - 16.0 km/h (266.7 m/min): VO2 = 56.84 -> MET = 16.2
 */
export function calculateSpeedMet(speedKmh: number): number {
  if (speedKmh <= 1.0) return 1.25;
  const speedMetersPerMin = (speedKmh * 1000) / 60;

  if (speedKmh < 6.0) {
    const vo2Walk = 0.1 * speedMetersPerMin + 3.5;
    return Math.max(2.0, vo2Walk / 3.5);
  } else {
    const vo2Run = 0.2 * speedMetersPerMin + 3.5;
    return Math.min(18.0, Math.max(6.0, vo2Run / 3.5));
  }
}

/**
 * Temperature thermoregulation factor:
 * Running in extreme heat (above 26°C) or freezing conditions elevates metabolic rate,
 * heart rate, and glycogen oxidation by 3% to 10%.
 */
export function getTemperatureMultiplier(temperatureC?: number): number {
  if (temperatureC == null) return 1.0;
  if (temperatureC >= 32) return 1.08; // High thermal stress
  if (temperatureC >= 27) return 1.04; // Warm outdoor environment
  if (temperatureC <= 4) return 1.05;  // Cold shivering & muscle friction
  return 1.0;
}

/**
 * Calculates calories burned in a segment.
 *
 * Formula:
 * Calories (kcal) = (MET * 3.5 * weightKg / 200) * (durationSeconds / 60) * thermalFactor
 *
 * @param phase The interval phase (tiro, trote, aquecimento, etc.)
 * @param durationSeconds Duration of the segment
 * @param weightKg Athlete body weight in kg (validated between 30 and 220 kg, defaults to 70 kg)
 * @param speedKmh Real-time speed from GPS (optional)
 * @param temperatureC Local ambient temperature in °C (optional)
 */
export function estimateCaloriesForSegment(
  phase: PhaseType,
  durationSeconds: number,
  weightKg = 70,
  speedKmh?: number,
  temperatureC?: number
): number {
  if (durationSeconds <= 0) return 0;
  const validWeight = Math.min(220, Math.max(30, weightKg || 70));

  let baseMet = PHASE_MET_MAP[phase] ?? 6.0;

  // When GPS speed is reliable (> 2.5 km/h), compute refined continuous MET
  if (speedKmh != null && speedKmh >= 2.5) {
    const speedMet = calculateSpeedMet(speedKmh);
    // During high intensity tiro, ensure exertion floor
    if (phase === 'high_intensity') {
      baseMet = Math.max(speedMet, 12.0);
    } else if (phase === 'rest') {
      // In rest phase, runner is slowing down or standing
      baseMet = speedKmh > 5.0 ? speedMet * 0.7 : 1.5;
    } else {
      // Blend programmed phase MET with actual physical velocity
      baseMet = 0.65 * speedMet + 0.35 * baseMet;
    }
  }

  const thermalFactor = getTemperatureMultiplier(temperatureC);
  const durationMinutes = durationSeconds / 60;
  const kcal = ((baseMet * 3.5 * validWeight) / 200) * durationMinutes * thermalFactor;

  return Math.max(0, kcal);
}

/**
 * Estimates total workout calories from workout item structure (for preview in cards & dashboard)
 */
export function estimateWorkoutPlannedCalories(
  steps: { phase: PhaseType; durationSeconds: number }[],
  weightKg = 70
): number {
  let total = 0;
  for (const s of steps) {
    total += estimateCaloriesForSegment(s.phase, s.durationSeconds, weightKg);
  }
  return Math.round(total);
}

/**
 * Dual-verification calculation:
 * Reconciles step-by-step MET accumulation with distance-based physical work (Margaria et al. benchmark: ~1.03 kcal/kg/km).
 * Prevents under-counting during high cadence or GPS multipath anomalies.
 */
export function reconcileFinalCalories(
  accumulatedKcal: number,
  distanceMeters: number,
  totalElapsedSeconds: number,
  weightKg = 70
): number {
  const validWeight = Math.min(220, Math.max(30, weightKg || 70));
  let finalKcal = accumulatedKcal;

  // Distance validation benchmark:
  if (distanceMeters >= 200) {
    const distanceKm = distanceMeters / 1000;
    // Standard running net energy expenditure ~ 1.036 kcal/kg/km
    const distanceKcal = distanceKm * validWeight * 1.036;

    // Minimum baseline based on distance covered
    finalKcal = Math.max(finalKcal, distanceKcal * 0.92);
  }

  // Minimum physiological resting floor for active human during exercise:
  // Basal rate is ~ 1.2 kcal/min for 70kg
  const minFloorKcal = (totalElapsedSeconds / 60) * (validWeight / 70) * 1.3;
  finalKcal = Math.max(finalKcal, minFloorKcal);

  return Math.round(finalKcal);
}
