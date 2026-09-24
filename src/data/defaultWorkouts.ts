import { Workout } from '../types/workout';

export const DEFAULT_WORKOUTS: Workout[] = [
  {
    id: 'workout_tiros_40_50',
    name: 'Tiros de 40s / 50s (4x)',
    description: 'Treino clássico para ganho de velocidade VO2 Máx com 4 repetições intervaladas intensas.',
    items: [
      {
        type: 'single',
        step: {
          id: 'step_w1',
          phase: 'warmup',
          durationSeconds: 300, // 5 min
          notes: 'Trote progressivo para aquecer pernas e elevar frequência',
        },
      },
      {
        type: 'block',
        block: {
          id: 'block_tiros',
          name: 'Série de Tiros de Alta Intensidade',
          repetitions: 4,
          steps: [
            {
              id: 'step_tiro',
              phase: 'high_intensity',
              durationSeconds: 40,
              notes: 'Ritmo forte (90% do esforço)',
            },
            {
              id: 'step_trote',
              phase: 'low_intensity',
              durationSeconds: 50,
              notes: 'Trote suave para recuperar o fôlego',
            },
          ],
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_walk_cooldown',
          phase: 'walk',
          durationSeconds: 180, // 3 min
          notes: 'Caminhada regenerativa para desaquecimento',
        },
      },
    ],
    createdAt: 1727180000000,
    updatedAt: 1727180000000,
  },
  {
    id: 'workout_piramide_28m',
    name: 'Treino Pirâmide (28 min)',
    description: 'Variação progressiva e regressiva de estímulos para resistência muscular e potência aeróbica.',
    items: [
      {
        type: 'single',
        step: {
          id: 'step_pir_w',
          phase: 'warmup',
          durationSeconds: 600, // 10 min
          notes: 'Aquecimento amplo e educativo de corrida',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_1_hi',
          phase: 'high_intensity',
          durationSeconds: 60, // 1 min
          notes: 'Tiro inicial ritmo 5km',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_1_lo',
          phase: 'low_intensity',
          durationSeconds: 60,
          notes: 'Trote moderado',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_2_hi',
          phase: 'high_intensity',
          durationSeconds: 120, // 2 min
          notes: 'Tiro sustentado ritmo forte',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_2_lo',
          phase: 'low_intensity',
          durationSeconds: 120,
          notes: 'Trote de recuperação',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_3_hi',
          phase: 'high_intensity',
          durationSeconds: 180, // 3 min (pico da pirâmide)
          notes: 'Pico da pirâmide: foco na postura',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_3_lo',
          phase: 'low_intensity',
          durationSeconds: 180,
          notes: 'Trote leve',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_4_hi',
          phase: 'high_intensity',
          durationSeconds: 120,
          notes: 'Descida da pirâmide: aceleração constante',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_4_lo',
          phase: 'low_intensity',
          durationSeconds: 60,
          notes: 'Trote leve',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_5_hi',
          phase: 'high_intensity',
          durationSeconds: 60,
          notes: 'Sprint final máximo!',
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_pir_cool',
          phase: 'walk',
          durationSeconds: 120,
          notes: 'Caminhada final de volta à calma',
        },
      },
    ],
    createdAt: 1727181000000,
    updatedAt: 1727181000000,
  },
  {
    id: 'workout_iniciante_caminhada',
    name: 'Iniciante: Trote & Caminhada',
    description: 'Ideal para quem está começando na corrida: alternância suave de 1 min de trote com 2 min de caminhada.',
    items: [
      {
        type: 'single',
        step: {
          id: 'step_ini_w',
          phase: 'warmup',
          durationSeconds: 300, // 5 min
          notes: 'Caminhada rápida para aquecimento',
        },
      },
      {
        type: 'block',
        block: {
          id: 'block_ini_reps',
          name: 'Ciclos de Adaptação (5x)',
          repetitions: 5,
          steps: [
            {
              id: 'step_ini_trote',
              phase: 'low_intensity',
              durationSeconds: 60, // 1 min
              notes: 'Trote bem leve e solto',
            },
            {
              id: 'step_ini_caminha',
              phase: 'walk',
              durationSeconds: 120, // 2 min
              notes: 'Caminhada para controlar a respiração',
            },
          ],
        },
      },
      {
        type: 'single',
        step: {
          id: 'step_ini_rest',
          phase: 'rest',
          durationSeconds: 120, // 2 min
          notes: 'Pausa para beber água e alongar',
        },
      },
    ],
    createdAt: 1727182000000,
    updatedAt: 1727182000000,
  },
];
