import { UserRole } from '../types';

export type Action = 'read' | 'write';

export type Resource =
  | 'filieres'
  | 'modules'
  | 'salles'
  | 'users'
  | 'formateurs'
  | 'groupes'
  | 'stagiaires'
  | 'emploi'
  | 'examens'
  | 'absences'
  | 'notes'
  | 'parametres'
  | 'dashboard';

const ALL: UserRole[] = ['directeur', 'surveillant', 'formateur', 'stagiaire'];

const MATRIX: Record<Resource, { read: UserRole[]; write: UserRole[] }> = {
  // Catalog — Directeur owns; everyone can read
  filieres:   { read: ALL, write: ['directeur'] },
  modules:    { read: ALL, write: ['directeur'] },
  salles:     { read: ALL, write: ['directeur'] },

  // HR / accounts — Directeur only
  users:      { read: ['directeur'], write: ['directeur'] },
  formateurs: { read: ['directeur', 'surveillant', 'formateur'], write: ['directeur'] },

  // Operational — Surveillant runs day-to-day
  groupes:    { read: ALL, write: ['directeur', 'surveillant'] },
  stagiaires: { read: ['directeur', 'surveillant', 'formateur'], write: ['directeur', 'surveillant'] },
  emploi:     { read: ALL, write: ['directeur', 'surveillant'] },
  examens:    { read: ALL, write: ['directeur', 'surveillant'] },

  // Teaching — Formateur enters notes + per-session absences
  absences:   { read: ALL, write: ['directeur', 'surveillant', 'formateur'] },
  notes:      { read: ALL, write: ['directeur', 'formateur'] },

  // System
  parametres: { read: ALL, write: ['directeur'] },
  dashboard:  { read: ['directeur', 'surveillant'], write: [] },
};

export function can(role: UserRole | undefined | null, action: Action, resource: Resource): boolean {
  if (!role) return false;
  return MATRIX[resource][action].includes(role);
}
