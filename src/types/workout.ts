export type PhaseType = 'warmup' | 'high_intensity' | 'low_intensity' | 'walk' | 'rest';

export interface PhaseConfig {
  id: PhaseType;
  label: string;
  shortLabel: string;
  category: 'warmup' | 'high' | 'low' | 'rest';
  colorBg: string;
  colorBorder: string;
  colorText: string;
  colorBadge: string;
  androidHexColor: string;
  description: string;
  iconName: string;
}

export const PHASE_CONFIGS: Record<PhaseType, PhaseConfig> = {
  warmup: {
    id: 'warmup',
    label: 'Aquecimento',
    shortLabel: 'Aquec.',
    category: 'warmup',
    colorBg: 'from-amber-600 to-amber-700',
    colorBorder: 'border-amber-400',
    colorText: 'text-amber-100',
    colorBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    androidHexColor: '#D97706',
    description: 'Preparo cardiovascular e muscular em ritmo confortável',
    iconName: 'Flame',
  },
  high_intensity: {
    id: 'high_intensity',
    label: 'Tiro Forte',
    shortLabel: 'Tiro',
    category: 'high',
    colorBg: 'from-rose-600 to-red-700',
    colorBorder: 'border-rose-400',
    colorText: 'text-rose-100',
    colorBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    androidHexColor: '#DC2626',
    description: 'Esforço máximo ou submáximo (85-95% FC Máx)',
    iconName: 'Zap',
  },
  low_intensity: {
    id: 'low_intensity',
    label: 'Trote Fraco',
    shortLabel: 'Trote',
    category: 'low',
    colorBg: 'from-emerald-600 to-green-700',
    colorBorder: 'border-emerald-400',
    colorText: 'text-emerald-100',
    colorBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    androidHexColor: '#059669',
    description: 'Recuperação ativa em corrida leve e ritmada',
    iconName: 'Activity',
  },
  walk: {
    id: 'walk',
    label: 'Caminhada',
    shortLabel: 'Caminh.',
    category: 'low',
    colorBg: 'from-cyan-600 to-blue-700',
    colorBorder: 'border-cyan-400',
    colorText: 'text-cyan-100',
    colorBadge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    androidHexColor: '#0284C7',
    description: 'Baixa intensidade para restabelecer a respiração',
    iconName: 'Footprints',
  },
  rest: {
    id: 'rest',
    label: 'Descanso',
    shortLabel: 'Pausa',
    category: 'rest',
    colorBg: 'from-slate-700 to-slate-800',
    colorBorder: 'border-slate-500',
    colorText: 'text-slate-200',
    colorBadge: 'bg-slate-600/30 text-slate-300 border-slate-500/40',
    androidHexColor: '#334155',
    description: 'Parada total ou hidratação rápida',
    iconName: 'Coffee',
  },
};

export interface WorkoutStep {
  id: string;
  phase: PhaseType;
  durationSeconds: number; // In seconds
  notes?: string;
}

export interface WorkoutBlock {
  id: string;
  name?: string;
  repetitions: number; // e.g. 4x
  steps: WorkoutStep[]; // e.g. [Tiro 40s, Trote 50s]
}

export type WorkoutItem = 
  | { type: 'single'; step: WorkoutStep }
  | { type: 'block'; block: WorkoutBlock };

export interface Workout {
  id: string;
  name: string;
  description: string;
  items: WorkoutItem[];
  createdAt: number;
  updatedAt: number;
}

export interface FlattenedStep {
  originalStepId: string;
  phase: PhaseType;
  durationSeconds: number;
  blockRepetitionIndex?: number; // 1-based (e.g. 2 of 4)
  totalBlockRepetitions?: number;
  blockName?: string;
  stepIndexInFlattened: number;
  totalFlattenedSteps: number;
}

export type SoundProfile = 'whistle' | 'siren' | 'high_digital' | 'boxing_bell' | 'classic';

export interface SoundProfileConfig {
  id: SoundProfile;
  name: string;
  description: string;
  volumeBoost: number;
}

export interface GpsRunMetrics {
  distanceMeters: number;
  formattedDistance: string; // e.g. "2.45 km" or "850 m"
  currentSpeedKmh: number;
  averagePaceMinKm: string; // e.g. "05:20 /km"
  gpsStatus: 'active' | 'searching' | 'simulated' | 'denied' | 'disabled';
  accuracyMeters: number | null;
}

export interface DashboardSummary {
  totalSeconds: number;
  formattedTotalTime: string;
  totalStepsCount: number;
  
  // Breakdown in seconds
  warmupSeconds: number;
  highIntensitySeconds: number;
  lowIntensitySeconds: number;
  restSeconds: number;

  // Breakdown formatted (e.g. "10 min", "40s")
  formattedWarmup: string;
  formattedHighIntensity: string;
  formattedLowIntensity: string;
  formattedRest: string;

  // Percentage breakdown for visual progress bar
  pctWarmup: number;
  pctHighIntensity: number;
  pctLowIntensity: number;
  pctRest: number;

  // Repetition cycles count
  totalRepetitionsCount: number;
}
