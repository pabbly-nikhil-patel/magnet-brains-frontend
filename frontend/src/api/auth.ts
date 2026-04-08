import api from './client';
import type { AuthResponse } from '../types';

export const authApi = {
  register: (data: { email: string; password: string; full_name: string; role?: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<import('../types').User>('/auth/me'),

  updateProfile: (data: { full_name?: string; bio?: string; phone?: string; avatar_url?: string }) =>
    api.put<import('../types').User>('/auth/profile', data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put('/auth/change-password', data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; new_password: string }) =>
    api.post('/auth/reset-password', data),
};
