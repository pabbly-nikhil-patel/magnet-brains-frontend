import api from './client';
import type { PlatformAnalytics, Category } from '../types';

export const adminApi = {
  listUsers: (params?: Record<string, string>) =>
    api.get('/admin/users', { params }),

  updateUserRole: (id: string, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),

  toggleUserActive: (id: string, is_active: boolean) =>
    api.put(`/admin/users/${id}/active`, { is_active }),

  listCourses: (params?: Record<string, string>) =>
    api.get('/admin/courses', { params }),

  approveCourse: (id: string) =>
    api.put(`/admin/courses/${id}/approve`),

  rejectCourse: (id: string, reason: string) =>
    api.put(`/admin/courses/${id}/reject`, { reason }),

  createCategory: (data: { name: string; type: string; parent_id?: string; sort_order?: number; icon_url?: string }) =>
    api.post<Category>('/admin/categories', data),

  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put<Category>(`/admin/categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete(`/admin/categories/${id}`),

  getAnalytics: () =>
    api.get<PlatformAnalytics>('/admin/analytics'),

  updateRevenueSettings: (default_platform_pct: number) =>
    api.put('/admin/revenue/settings', { default_platform_pct }),

  setInstructorOverride: (instructor_id: string, platform_pct: number) =>
    api.put('/admin/revenue/override', { instructor_id, platform_pct }),

  listPendingPayouts: () =>
    api.get('/admin/payouts'),

  processPayouts: (earning_ids: string[], payout_reference: string) =>
    api.post('/admin/payouts/process', { earning_ids, payout_reference }),

  getHomepage: () =>
    api.get('/homepage'),

  createHomepageContent: (data: Record<string, unknown>) =>
    api.post('/admin/homepage', data),

  updateHomepageContent: (id: string, data: Record<string, unknown>) =>
    api.put(`/admin/homepage/${id}`, data),
};
