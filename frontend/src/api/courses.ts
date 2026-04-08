import api from './client';
import type { Course, CourseListItem, Category, PaginatedResponse } from '../types';

export const coursesApi = {
  list: (params?: Record<string, string>) =>
    api.get<PaginatedResponse<CourseListItem>>('/courses', { params }),

  getBySlug: (slug: string) =>
    api.get<Course>(`/courses/${slug}`),

  search: (q: string, page = 1) =>
    api.get<PaginatedResponse<CourseListItem>>('/courses/search', { params: { q, page } }),

  getCategories: () =>
    api.get<Category[]>('/categories'),

  getCategoryCourses: (slug: string, params?: Record<string, string>) =>
    api.get<PaginatedResponse<CourseListItem>>(`/categories/${slug}/courses`, { params }),

  getLectureStream: (lectureId: string) =>
    api.get<{ stream_url: string; duration: number; title: string }>(`/lectures/${lectureId}/stream`),
};
