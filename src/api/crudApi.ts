import axiosInstance from './axiosInstance';
import { ApiResponse, PaginatedResponse, Filiere, Group, Module, Salle, Formateur, Stagiaire, Examen, User, EmploiDuTemps, Absence } from '../types';

interface QueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  [key: string]: any;
}

export function createCrudApi<T>(basePath: string) {
  return {
    getAll: (params?: QueryParams) =>
      axiosInstance.get<PaginatedResponse<T>>(basePath, { params }),

    getById: (id: number) =>
      axiosInstance.get<ApiResponse<T>>(`${basePath}/${id}`),

    create: (data: Partial<T>) =>
      axiosInstance.post<ApiResponse<T>>(basePath, data),

    update: (id: number, data: Partial<T>) =>
      axiosInstance.put<ApiResponse<T>>(`${basePath}/${id}`, data),

    delete: (id: number) =>
      axiosInstance.delete<ApiResponse<null>>(`${basePath}/${id}`),
  };
}

export const filieresApi = createCrudApi<Filiere>('/filieres');
export const groupsApi = createCrudApi<Group>('/groups');
export const modulesApi = {
  ...createCrudApi<Module>('/modules'),
  bulkImport: (filiere_id: number, modules: Array<{ code?: string; nom: string; heures_total: number; coefficient?: number; semestre?: number; description?: string }>) =>
    axiosInstance.post('/modules/bulk', { filiere_id, modules }),
};
export const sallesApi = createCrudApi<Salle>('/salles');
export const formateursApi = createCrudApi<Formateur>('/formateurs');
export const stagiairesApi = {
  ...createCrudApi<Stagiaire>('/stagiaires'),
  bulkImport: (group_id: number, stagiaires: Array<any>) =>
    axiosInstance.post('/stagiaires/bulk', { group_id, stagiaires }),
};
export const examensApi = createCrudApi<Examen>('/examens');
export const usersApi = createCrudApi<User>('/users');
export const emploiDuTempsApi = createCrudApi<EmploiDuTemps>('/emploi-du-temps');
export const absencesApi = {
  ...createCrudApi<Absence>('/absences'),
  justify: (id: number, file: File, note?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (note) fd.append('note', note);
    return axiosInstance.post(`/absences/${id}/justify`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Special endpoints
export const notesApi = {
  getAll: (params?: QueryParams) =>
    axiosInstance.get('/notes', { params }),
  batchStore: (notes: Array<{ stagiaire_id: number; examen_id: number; note: number; remarque?: string }>) =>
    axiosInstance.post('/notes/batch', { notes }),
  update: (id: number, data: { note: number; remarque?: string }) =>
    axiosInstance.put(`/notes/${id}`, data),
};

export const gradesApi = {
  getByGroupModule: (group_id: number, module_id: number) =>
    axiosInstance.get('/grades', { params: { group_id, module_id } }),
};

// Dropdown data (all active, no pagination)
export const dropdownApi = {
  filieres: () => axiosInstance.get('/filieres-all'),
  groups: (params?: { filiere_id?: number }) => axiosInstance.get('/groups-all', { params }),
  salles: () => axiosInstance.get('/salles-all'),
  formateurs: () => axiosInstance.get('/formateurs-all'),
};

// Notifications (self-scoped to the authenticated user)
export const notificationsApi = {
  list: () => axiosInstance.get('/notifications'),
  unreadCount: () => axiosInstance.get<{ data: { count: number } }>('/notifications/unread-count'),
  markRead: (id: number) => axiosInstance.post(`/notifications/${id}/read`),
  markAllRead: () => axiosInstance.post('/notifications/read-all'),
};
