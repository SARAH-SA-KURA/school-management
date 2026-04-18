import axiosInstance from './axiosInstance';
import { ApiResponse, AuthResponse, LoginCredentials, User } from '../types';

export const authApi = {
  login: (credentials: LoginCredentials) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', credentials),

  verifyEmail: (data: { email: string; code: string }) =>
    axiosInstance.post<ApiResponse<{ verified: boolean }>>('/auth/verify-email', data),

  verify2FA: (data: { code: string; token: string }) =>
    axiosInstance.post<ApiResponse<AuthResponse>>('/auth/verify-2fa', data),

  forgotPassword: (data: { email: string }) =>
    axiosInstance.post<ApiResponse<{ message: string }>>('/auth/forgot-password', data),

  resetPassword: (data: { token: string; email: string; password: string; password_confirmation: string }) =>
    axiosInstance.post<ApiResponse<{ message: string }>>('/auth/reset-password', data),

  getMe: () =>
    axiosInstance.get<ApiResponse<User>>('/auth/me'),

  logout: () =>
    axiosInstance.post<ApiResponse<null>>('/auth/logout'),

  updateProfile: (data: FormData) =>
    axiosInstance.post<ApiResponse<User>>('/auth/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  changePassword: (data: { old_password: string; new_password: string; new_password_confirmation: string }) =>
    axiosInstance.post<ApiResponse<{ message: string }>>('/auth/password', data),
};
