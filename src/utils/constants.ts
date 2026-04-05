export const APP_NAME = 'MACOMPUS';
export const APP_DESCRIPTION = 'Système de gestion de centre de formation';

export const ROLES = {
  DIRECTEUR: 'directeur' as const,
  FORMATEUR: 'formateur' as const,
  STAGIAIRE: 'stagiaire' as const,
  SURVEILLANT: 'surveillant' as const,
};

export const ROLE_LABELS: Record<string, string> = {
  directeur: 'Directeur',
  formateur: 'Formateur',
  stagiaire: 'Stagiaire',
  surveillant: 'Surveillant Général',
};

export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

export const JOUR_LABELS: Record<string, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
};

export const SALLE_TYPES = [
  { value: 'cours', label: 'Salle de cours' },
  { value: 'tp', label: 'Salle TP' },
  { value: 'amphi', label: 'Amphithéâtre' },
  { value: 'reunion', label: 'Salle de réunion' },
];

export const EXAMEN_TYPES = [
  { value: 'controle', label: 'Contrôle continu' },
  { value: 'efm', label: 'Examen de fin de module' },
  { value: 'eff', label: 'Examen de fin de formation' },
  { value: 'rattrapage', label: 'Rattrapage' },
];

export const STAGIAIRE_STATUSES = [
  { value: 'actif', label: 'Actif' },
  { value: 'abandon', label: 'Abandon' },
  { value: 'diplome', label: 'Diplômé' },
  { value: 'suspendu', label: 'Suspendu' },
];

export const ABSENCE_STATUSES = [
  { value: 'non_justifiee', label: 'Non justifiée' },
  { value: 'justifiee', label: 'Justifiée' },
  { value: 'en_attente', label: 'En attente' },
];

export const TIME_SLOTS = [
  '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00',
  '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
];

export const ITEMS_PER_PAGE = 10;
