export interface FastingStage {
  level: number;
  targetHours: number;
  category: string;
  name: string;
  badgeName: string;
  badgeIcon: string;
  rewardXp: number;
  description: string;
  metabolicBenefits: string[];
  exactUserBenefit: string;
  voiceCue: string;
  color: string;
}

export interface FastingSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  targetHours: number;
  stageLevel: number;
  completedHours: number;
  success: boolean;
  notes?: string;
  xpEarned?: number;
  milestonesPassed?: number[];
}

export interface FastingProfile {
  unlockedLevel: number; // Highest level unlocked (starts at 1 = 2h)
  totalXp: number;
  streakDays: number;
  lastFastDate?: string; // YYYY-MM-DD
  totalFastingSeconds: number;
  totalCompletedFasts: number;
  unlockedBadges: string[]; // List of badge names
  activeFast: {
    startTime: number;
    targetHours: number;
    stageLevel: number;
    awardedMilestones?: number[]; // [2, 4, 6...]
  } | null;
}

export const FASTING_STAGES: FastingStage[] = [
  // De 2 a 6 horas: Fase alimentada e início da digestão
  {
    level: 1,
    targetHours: 2,
    category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
    name: 'Fase Anabólica Ativa',
    badgeName: 'Iniciativa 2h',
    badgeIcon: 'Sparkles',
    rewardXp: 100,
    description: 'O corpo está na fase anabólica ativa. Ele absorve os nutrientes da refeição mais recente, elevando temporariamente o açúcar no sangue e a insulina.',
    metabolicBenefits: [
      'Absorção dos nutrientes da refeição recente',
      'Fase anabólica ativa de restauração celular',
      'Início do descanso estomacal',
    ],
    exactUserBenefit: 'O corpo está na fase anabólica ativa. Ele absorve os nutrientes da refeição mais recente, elevando temporariamente o açúcar no sangue e a insulina.',
    voiceCue: 'Parabéns! Você alcançou 2 horas de jejum. O corpo está na fase anabólica ativa absorvendo nutrientes e iniciando o descanso digestivo.',
    color: '#06B6D4', // Cyan-500
  },
  {
    level: 2,
    targetHours: 4,
    category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
    name: 'Digestão Concluída',
    badgeName: 'Equilíbrio 4h',
    badgeIcon: 'Zap',
    rewardXp: 200,
    description: 'O processo de digestão principal termina na maioria das pessoas. Os níveis de glicose no sangue começam a se estabilizar.',
    metabolicBenefits: [
      'Processo de digestão principal concluído',
      'Níveis de glicose no sangue estabilizando',
      'Fim do esforço gástrico pesado',
    ],
    exactUserBenefit: 'O processo de digestão principal termina na maioria das pessoas. Os níveis de glicose no sangue começam a se estabilizar.',
    voiceCue: 'Muito bom! 4 horas de jejum. O processo de digestão principal terminou e seus níveis de glicose no sangue estão estabilizando.',
    color: '#0EA5E9', // Sky-500
  },
  {
    level: 3,
    targetHours: 6,
    category: 'De 2 a 6 horas: Fase alimentada e início da digestão',
    name: 'Descanso Pancreático',
    badgeName: 'Descanso 6h',
    badgeIcon: 'Flame',
    rewardXp: 300,
    description: 'A insulina começa a cair gradualmente. O pâncreas ganha um descanso da produção constante deste hormônio.',
    metabolicBenefits: [
      'Insulina começa a cair gradualmente',
      'Pâncreas ganha descanso da produção hormonal',
      'Gasto dos últimos nutrientes circulantes',
    ],
    exactUserBenefit: 'A insulina começa a cair gradualmente. O pâncreas ganha um descanso da produção constante deste hormônio.',
    voiceCue: 'Sensacional! 6 horas de jejum. A insulina começa a cair e seu pâncreas ganha um descanso merecido.',
    color: '#3B82F6', // Blue-500
  },

  // De 8 a 12 horas: A virada metabólica
  {
    level: 4,
    targetHours: 8,
    category: 'De 8 a 12 horas: A virada metabólica',
    name: 'Liberação de Glicogênio',
    badgeName: 'Virada 8h',
    badgeIcon: 'Moon',
    rewardXp: 400,
    description: 'O fígado começa a liberar o glicogênio estocado para manter a energia circulante.',
    metabolicBenefits: [
      'Fígado libera glicogênio estocado',
      'Manutenção contínua da energia circulante',
      'Transição suave para reservas internas',
    ],
    exactUserBenefit: 'O fígado começa a liberar o glicogênio estocado para manter a energia circulante.',
    voiceCue: '8 horas de jejum completadas! A virada metabólica começou. O fígado está liberando o glicogênio estocado para manter sua energia.',
    color: '#6366F1', // Indigo-500
  },
  {
    level: 5,
    targetHours: 10,
    category: 'De 8 a 12 horas: A virada metabólica',
    name: 'Sinal de Troca Energética',
    badgeName: 'Transição 10h',
    badgeIcon: 'TrendingUp',
    rewardXp: 500,
    description: 'Os níveis de insulina reduzem-se drasticamente, enviando um sinal químico para que o corpo mude a sua fonte principal de energia.',
    metabolicBenefits: [
      'Insulina reduzida drasticamente',
      'Sinal químico enviado para trocar fonte de energia',
      'Preparação celular para queima lipídica',
    ],
    exactUserBenefit: 'Os níveis de insulina reduzem-se drasticamente, enviando um sinal químico para que o corpo mude a sua fonte principal de energia.',
    voiceCue: '10 horas de jejum! Os níveis de insulina reduziram-se drasticamente, sinalizando para o corpo trocar a fonte principal de energia.',
    color: '#8B5CF6', // Violet-500
  },
  {
    level: 6,
    targetHours: 12,
    category: 'De 8 a 12 horas: A virada metabólica',
    name: 'Estado de Jejum Real',
    badgeName: 'Jejum Real 12h',
    badgeIcon: 'Sun',
    rewardXp: 600,
    description: 'Inicia-se o estado de jejum real. Os estoques de glicogênio hepático começam a se esgotar, dando o "sinal verde" inicial para a mobilização de gordura.',
    metabolicBenefits: [
      'Início do estado de jejum real',
      'Glicogênio hepático quase esgotado',
      'Sinal verde para mobilização de gordura',
    ],
    exactUserBenefit: 'Inicia-se o estado de jejum real. Os estoques de glicogênio hepático começam a se esgotar, dando o "sinal verde" inicial para a mobilização de gordura.',
    voiceCue: 'Excelente! 12 horas de jejum. Você entrou no estado de jejum real. Sinal verde para a mobilização e queima de gordura!',
    color: '#10B981', // Emerald-500
  },

  // De 14 a 18 horas: Queima de gordura e início da cetose
  {
    level: 7,
    targetHours: 14,
    category: 'De 14 a 18 horas: Queima de gordura e início da cetose',
    name: 'Lipólise Acelerada',
    badgeName: 'Lipólise 14h',
    badgeIcon: 'Flame',
    rewardXp: 750,
    description: 'O organismo aumenta significativamente a lipólise (quebra de gordura corporal para geração de energia).',
    metabolicBenefits: [
      'Aumento significativo da lipólise',
      'Quebra de gordura corporal acelerada',
      'Gordura como fonte primária de combustível',
    ],
    exactUserBenefit: 'O organismo aumenta significativamente a lipólise (quebra de gordura corporal para geração de energia).',
    voiceCue: '14 horas de jejum! O organismo aumentou significativamente a lipólise, quebrando gordura corporal para gerar energia.',
    color: '#F59E0B', // Amber-500
  },
  {
    level: 8,
    targetHours: 16,
    category: 'De 14 a 18 horas: Queima de gordura e início da cetose',
    name: 'Padrão 16:8 & Autofagia',
    badgeName: 'Autofagia 16h',
    badgeIcon: 'ShieldAlert',
    rewardXp: 1000,
    description: 'Considerado o padrão mais popular (método 16:8). Aqui, a produção de corpos cetônicos pelo fígado começa a acelerar e pequenas respostas de autofagia (limpeza celular) têm início.',
    metabolicBenefits: [
      'Método lendário 16:8 Leangains',
      'Produção acelerada de corpos cetônicos no fígado',
      'Início das respostas de autofagia e limpeza celular',
    ],
    exactUserBenefit: 'Considerado o padrão mais popular (método 16:8). Aqui, a produção de corpos cetônicos pelo fígado começa a acelerar e pequenas respostas de autofagia (limpeza celular) têm início.',
    voiceCue: 'Parabéns, guerreiro! 16 horas de jejum concluídas. Método 16:8 atingido. Corpos cetônicos acelerando e início da autofagia celular!',
    color: '#EF4444', // Red-500
  },
  {
    level: 9,
    targetHours: 18,
    category: 'De 14 a 18 horas: Queima de gordura e início da cetose',
    name: 'Pico de HGH & Foco Mental',
    badgeName: 'Foco Mental 18h',
    badgeIcon: 'BatteryCharging',
    rewardXp: 1250,
    description: 'O hormônio do crescimento (HGH) começa a se elevar substancialmente para proteger a massa magra. Os níveis de energia e foco mental aumentam graças aos corpos cetônicos que alimentam o cérebro.',
    metabolicBenefits: [
      'Hormônio do crescimento (HGH) elevado substancialmente',
      'Proteção e preservação da massa magra',
      'Clareza mental e foco alimentados por corpos cetônicos',
    ],
    exactUserBenefit: 'O hormônio do crescimento (HGH) começa a se elevar substancialmente para proteger a massa magra. Os níveis de energia e foco mental aumentam graças aos corpos cetônicos que alimentam o cérebro.',
    voiceCue: '18 horas de jejum! O hormônio do crescimento HGH está elevado protegendo sua massa muscular, e o cérebro está em foco total com corpos cetônicos!',
    color: '#EC4899', // Pink-500
  },

  // De 20 a 24 horas: Limpeza celular profunda (Autofagia)
  {
    level: 10,
    targetHours: 20,
    category: 'De 20 a 24 horas: Limpeza celular profunda (Autofagia)',
    name: 'Anti-Inflamação Sistêmica',
    badgeName: 'Resiliência 20h',
    badgeIcon: 'Sword',
    rewardXp: 1500,
    description: 'A transição para o uso de gordura como combustível é pronunciada. A inflamação sistêmica começa a dar sinais de redução.',
    metabolicBenefits: [
      'Uso de gordura pronunciado como combustível',
      'Redução ativa da inflamação sistêmica',
      'Desintoxicação profunda dos tecidos',
    ],
    exactUserBenefit: 'A transição para o uso de gordura como combustível é pronunciada. A inflamação sistêmica começa a dar sinais de redução.',
    voiceCue: '20 horas de jejum! Transição pronunciada para queima de gordura e redução notável da inflamação sistêmica.',
    color: '#D946EF', // Fuchsia-500
  },
  {
    level: 11,
    targetHours: 22,
    category: 'De 20 a 24 horas: Limpeza celular profunda (Autofagia)',
    name: 'Autofagia em Nível Máximo',
    badgeName: 'Reciclagem 22h',
    badgeIcon: 'Zap',
    rewardXp: 2000,
    description: 'A autofagia atinge níveis mais altos. Suas células começam a identificar e reciclar proteínas velhas, danificadas e componentes celulares disfuncionais.',
    metabolicBenefits: [
      'Autofagia atinge níveis máximos',
      'Reciclagem de proteínas velhas e danificadas',
      'Eliminação de componentes celulares disfuncionais',
    ],
    exactUserBenefit: 'A autofagia atinge níveis mais altos. Suas células começam a identificar e reciclar proteínas velhas, danificadas e componentes celulares disfuncionais.',
    voiceCue: '22 horas de jejum extraordinárias! A autofagia atingiu níveis máximos. Suas células estão reciclando componentes velhos e danificados!',
    color: '#A855F7', // Purple-500
  },
  {
    level: 12,
    targetHours: 24,
    category: 'De 20 a 24 horas: Limpeza celular profunda (Autofagia)',
    name: 'Cetose Profunda & Reparo Total',
    badgeName: 'Mestre 24h',
    badgeIcon: 'Crown',
    rewardXp: 2500,
    description: 'O ciclo de um dia completo resulta no esgotamento severo do glicogênio. O corpo entra em um estado de cetose mais profundo, otimizando o reparo celular e reduzindo drasticamente marcadores inflamatórios.',
    metabolicBenefits: [
      'Esgotamento severo do glicogênio e ciclo de 24h completo',
      'Cetose mais profunda e reparo celular otimizado',
      'Redução drástica de todos os marcadores inflamatórios',
    ],
    exactUserBenefit: 'O ciclo de um dia completo resulta no esgotamento severo do glicogênio. O corpo entra em um estado de cetose mais profundo, otimizando o reparo celular e reduzindo drasticamente marcadores inflamatórios.',
    voiceCue: 'Vitória épica! 24 horas de jejum concluídas! Cetose profunda, reparo celular otimizado e redução drástica da inflamação. Você é um Mestre do Jejum!',
    color: '#FBBF24', // Amber/Gold-400
  },
];
