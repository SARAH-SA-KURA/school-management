// User & Auth types
export type UserRole = 'directeur' | 'formateur' | 'stagiaire' | 'surveillant';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  telephone?: string;
  avatar?: string;
  email_verified_at?: string;
  two_factor_enabled?: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Filiere
export interface Filiere {
  id: number;
  code: string;
  nom: string;
  description?: string;
  duree_mois: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  groups_count?: number;
  modules_count?: number;
}

// Group
export interface Group {
  id: number;
  nom: string;
  filiere_id: number;
  filiere?: Filiere;
  annee: number;
  annee_scolaire: string;
  max_stagiaires: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stagiaires_count?: number;
}

// Module
export interface Module {
  id: number;
  code: string;
  nom: string;
  description?: string;
  coefficient: number;
  heures_total: number;
  filiere_id: number;
  filiere?: Filiere;
  semestre: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Salle
export type SalleType = 'cours' | 'tp' | 'amphi' | 'reunion';

export interface Salle {
  id: number;
  nom: string;
  type: SalleType;
  capacite: number;
  batiment?: string;
  equipements?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Formateur
export interface Formateur {
  id: number;
  user_id: number;
  user?: User;
  matricule: string;
  specialisation: string;
  date_recrutement: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  modules?: Module[];
}

// Stagiaire
export type StagiaireStatus = 'actif' | 'abandon' | 'diplome' | 'suspendu';

export interface Stagiaire {
  id: number;
  user_id: number;
  user?: User;
  cef: string;
  cne: string;
  cin: string;
  group_id: number;
  group?: Group;
  date_inscription: string;
  date_naissance: string;
  adresse?: string;
  status: StagiaireStatus;
  created_at: string;
  updated_at: string;
}

// Emploi du temps
export interface EmploiDuTemps {
  id: number;
  group_id: number;
  group?: Group;
  module_id: number;
  module?: Module;
  formateur_id: number;
  formateur?: Formateur;
  salle_id: number;
  salle?: Salle;
  jour: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi';
  heure_debut: string;
  heure_fin: string;
  created_at: string;
  updated_at: string;
}

// Examen
export type ExamenType = 'controle' | 'efm' | 'eff' | 'rattrapage';

export interface Examen {
  id: number;
  module_id: number;
  module?: Module;
  group_id: number;
  group?: Group;
  salle_id?: number;
  salle?: Salle;
  formateur_id: number;
  formateur?: Formateur;
  surveillant_id?: number;
  type: ExamenType;
  date_examen: string;
  heure_debut: string;
  heure_fin: string;
  created_at: string;
  updated_at: string;
}

// Note
export interface Note {
  id: number;
  stagiaire_id: number;
  stagiaire?: Stagiaire;
  examen_id: number;
  examen?: Examen;
  note: number;
  remarque?: string;
  created_at: string;
  updated_at: string;
}

// Absence
export type AbsenceStatus = 'non_justifiee' | 'justifiee' | 'en_attente';

export interface Absence {
  id: number;
  stagiaire_id: number;
  stagiaire?: Stagiaire;
  module_id: number;
  module?: Module;
  date_absence: string;
  heure_debut: string;
  heure_fin: string;
  motif?: string;
  justification?: string;
  status: AbsenceStatus;
  created_at: string;
  updated_at: string;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Activity Log
export interface ActivityLog {
  id: number;
  user_id: number;
  user?: User;
  action: string;
  description: string;
  properties?: Record<string, unknown>;
  created_at: string;
}

// Dashboard Stats
export interface DashboardStats {
  total_stagiaires: number;
  total_formateurs: number;
  total_filieres: number;
  total_groups: number;
  total_modules: number;
  total_salles: number;
}

// Table & UI types
export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
}
