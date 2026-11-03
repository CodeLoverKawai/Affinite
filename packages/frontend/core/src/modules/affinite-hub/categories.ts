export const CANONICAL_CATEGORIES = [
  'Trabajo',
  'Estudio',
  'Salud',
  'Fitness',
  'Mente',
  'Productividad',
  'Personal',
  'General',
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<CanonicalCategory, string> = {
  Trabajo: '#3b82f6',
  Estudio: '#8b5cf6',
  Salud: '#10b981',
  Fitness: '#f59e0b',
  Mente: '#06b6d4',
  Productividad: '#ec4899',
  Personal: '#6366f1',
  General: '#64748b',
};

export const CATEGORY_ALIASES: Record<string, CanonicalCategory> = {
  // Trabajo / Work
  trabajo: 'Trabajo',
  trabajar: 'Trabajo',
  laboral: 'Trabajo',
  profesional: 'Trabajo',
  empleo: 'Trabajo',
  oficina: 'Trabajo',
  negocio: 'Trabajo',
  negocios: 'Trabajo',
  work: 'Trabajo',
  job: 'Trabajo',
  career: 'Trabajo',
  office: 'Trabajo',
  business: 'Trabajo',
  professional: 'Trabajo',

  // Estudio / Study
  estudio: 'Estudio',
  estudios: 'Estudio',
  estudiar: 'Estudio',
  universidad: 'Estudio',
  escuela: 'Estudio',
  colegio: 'Estudio',
  academico: 'Estudio',
  educacion: 'Estudio',
  lectura: 'Estudio',
  curso: 'Estudio',
  cursos: 'Estudio',
  aprender: 'Estudio',
  aprendizaje: 'Estudio',
  study: 'Estudio',
  studies: 'Estudio',
  school: 'Estudio',
  college: 'Estudio',
  university: 'Estudio',
  academic: 'Estudio',
  education: 'Estudio',
  learning: 'Estudio',
  course: 'Estudio',
  courses: 'Estudio',
  reading: 'Estudio',

  // Salud / Health
  salud: 'Salud',
  medico: 'Salud',
  medicina: 'Salud',
  bienestar: 'Salud',
  nutricion: 'Salud',
  dieta: 'Salud',
  doctor: 'Salud',
  clinica: 'Salud',
  terapia: 'Salud',
  sueno: 'Salud',
  dormir: 'Salud',
  health: 'Salud',
  medical: 'Salud',
  wellness: 'Salud',
  nutrition: 'Salud',
  diet: 'Salud',
  clinic: 'Salud',
  therapy: 'Salud',
  sleep: 'Salud',

  // Fitness
  fitness: 'Fitness',
  ejercicio: 'Fitness',
  ejercicios: 'Fitness',
  entrenamiento: 'Fitness',
  entrenar: 'Fitness',
  deporte: 'Fitness',
  deportes: 'Fitness',
  gym: 'Fitness',
  gimnasio: 'Fitness',
  pesas: 'Fitness',
  cardio: 'Fitness',
  correr: 'Fitness',
  running: 'Fitness',
  workout: 'Fitness',
  workouts: 'Fitness',
  crossfit: 'Fitness',
  exercise: 'Fitness',
  training: 'Fitness',
  sport: 'Fitness',
  sports: 'Fitness',

  // Mente / Mind
  mente: 'Mente',
  mindfulness: 'Mente',
  meditacion: 'Mente',
  meditar: 'Mente',
  espiritualidad: 'Mente',
  psicologia: 'Mente',
  zen: 'Mente',
  calma: 'Mente',
  reflexion: 'Mente',
  diario: 'Mente',
  journaling: 'Mente',
  mind: 'Mente',
  mental: 'Mente',
  meditation: 'Mente',
  meditate: 'Mente',
  spirituality: 'Mente',
  psychology: 'Mente',
  reflection: 'Mente',
  journal: 'Mente',

  // Productividad / Productivity
  productividad: 'Productividad',
  organizacion: 'Productividad',
  proyectos: 'Productividad',
  proyecto: 'Productividad',
  tareas: 'Productividad',
  tarea: 'Productividad',
  metas: 'Productividad',
  meta: 'Productividad',
  objetivos: 'Productividad',
  objetivo: 'Productividad',
  enfoque: 'Productividad',
  focus: 'Productividad',
  productivity: 'Productividad',
  organization: 'Productividad',
  project: 'Productividad',
  projects: 'Productividad',
  task: 'Productividad',
  tasks: 'Productividad',
  goal: 'Productividad',
  goals: 'Productividad',
  planning: 'Productividad',

  // Personal
  personal: 'Personal',
  vida: 'Personal',
  familia: 'Personal',
  amigos: 'Personal',
  relaciones: 'Personal',
  hogar: 'Personal',
  casa: 'Personal',
  ocio: 'Personal',
  hobby: 'Personal',
  hobbies: 'Personal',
  social: 'Personal',
  life: 'Personal',
  family: 'Personal',
  friends: 'Personal',
  relationships: 'Personal',
  home: 'Personal',
  leisure: 'Personal',

  // General
  general: 'General',
  otros: 'General',
  otro: 'General',
  varios: 'General',
  miscelaneo: 'General',
  other: 'General',
  others: 'General',
  misc: 'General',
  miscellaneous: 'General',
  default: 'General',
};

/**
 * Normalizes any category string into one of the canonical categories.
 * Handles undefined/null, whitespace, casing, and accents cleanly.
 * Falls back to 'General' for unknown or empty categories.
 */
export function normalizeCategory(input?: string | null): CanonicalCategory {
  if (!input) {
    return 'General';
  }

  const cleaned = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!cleaned) {
    return 'General';
  }

  const matched = CATEGORY_ALIASES[cleaned];
  if (matched) {
    return matched;
  }

  const matchedCanonical = CANONICAL_CATEGORIES.find(
    cat =>
      cat
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') === cleaned
  );

  return matchedCanonical ?? 'General';
}
