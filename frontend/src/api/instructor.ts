import api from './client';
import type { InstructorDashboard, InstructorCourseItem, EarningsSummary, Course } from '../types';

export const instructorApi = {
  listCourses: () =>
    api.get<InstructorCourseItem[]>('/instructor/courses'),

  createCourse: (data: Record<string, unknown>) =>
    api.post<Course>('/instructor/courses', data),

  updateCourse: (id: string, data: Record<string, unknown>) =>
    api.put<Course>(`/instructor/courses/${id}`, data),

  deleteCourse: (id: string) =>
    api.delete(`/instructor/courses/${id}`),

  submitCourse: (id: string) =>
    api.post(`/instructor/courses/${id}/submit`),

  createChapter: (courseId: string, data: { title: string; sort_order?: number }) =>
    api.post(`/instructor/courses/${courseId}/chapters`, data),

  updateChapter: (id: string, data: { title?: string; sort_order?: number }) =>
    api.put(`/instructor/chapters/${id}`, data),

  deleteChapter: (id: string) =>
    api.delete(`/instructor/chapters/${id}`),

  createLecture: (chapterId: string, data: { title: string; description?: string; sort_order?: number; is_preview?: boolean }) =>
    api.post(`/instructor/chapters/${chapterId}/lectures`, data),

  updateLecture: (id: string, data: Record<string, unknown>) =>
    api.put(`/instructor/lectures/${id}`, data),

  deleteLecture: (id: string) =>
    api.delete(`/instructor/lectures/${id}`),

  getDashboard: () =>
    api.get<InstructorDashboard>('/instructor/dashboard'),

  getEarnings: () =>
    api.get<EarningsSummary>('/instructor/earnings'),

  getPresignedUrl: (data: { file_name: string; content_type: string; upload_type: string }) =>
    api.post<{ upload_url: string; s3_key: string; public_url: string }>('/upload/presigned-url', data),
};
