import api from './client';
import type { EnrolledCourse, BookmarkItem, StudentDashboard, PaymentHistoryItem } from '../types';

export const studentApi = {
  enroll: (courseId: string) =>
    api.post(`/student/enroll/${courseId}`),

  listEnrollments: () =>
    api.get<EnrolledCourse[]>('/student/enrollments'),

  getProgress: (courseId: string) =>
    api.get<CourseProgress>(`/student/progress/${courseId}`),

  updateProgress: (data: { lecture_id: string; course_id: string; watched_seconds: number; is_completed?: boolean }) =>
    api.post('/student/progress', data),

  listBookmarks: () =>
    api.get<BookmarkItem[]>('/student/bookmarks'),

  addBookmark: (data: { course_id?: string; lecture_id?: string }) =>
    api.post('/student/bookmarks', data),

  removeBookmark: (id: string) =>
    api.delete(`/student/bookmarks/${id}`),

  getDashboard: () =>
    api.get<StudentDashboard>('/student/dashboard'),
};

export interface CourseProgress {
  course_id: string;
  progress_pct: number;
  total_lectures: number;
  completed_lectures: number;
  lectures: {
    lecture_id: string;
    title: string;
    watched_seconds: number;
    is_completed: boolean;
    last_watched_at?: string;
  }[];
}

export const paymentsApi = {
  createOrder: (courseId: string) =>
    api.post<{ order_id: string; amount: number; currency: string; razorpay_key: string; course_title: string }>(
      '/payments/create-order', { course_id: courseId }
    ),

  verifyPayment: (data: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
    course_id: string;
  }) => api.post('/payments/verify', data),

  getHistory: () =>
    api.get<PaymentHistoryItem[]>('/payments/history'),
};
