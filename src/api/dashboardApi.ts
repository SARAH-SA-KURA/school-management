import axiosInstance from './axiosInstance';
import { ApiResponse, DashboardStats, ActivityLog } from '../types';

export const dashboardApi = {
  getStats: () =>
    axiosInstance.get<ApiResponse<DashboardStats>>('/dashboard/stats'),

  getRecentActivity: () =>
    axiosInstance.get<ApiResponse<ActivityLog[]>>('/dashboard/recent-activity'),

  getStagiairesByFiliere: () =>
    axiosInstance.get<ApiResponse<{ filiere: string; count: number }[]>>('/dashboard/stagiaires-by-filiere'),
};
