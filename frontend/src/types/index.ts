export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'student' | 'instructor' | 'admin';
  avatar_url?: string;
  bio?: string;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  short_desc?: string;
  thumbnail_url?: string;
  instructor_id?: string;
  instructor_name: string;
  instructor_photo_url?: string;
  instructor_bio?: string;
  board_name?: string;
  class_name?: string;
  stream_name?: string;
  subject_name?: string;
  is_free: boolean;
  price?: number;
  discount_pct?: number;
  language: string;
  level?: string;
  syllabus_points?: string[];
  tags?: string[];
  is_full_course: boolean;
  total_chapters: number;
  total_lectures: number;
  total_duration: number;
  total_enrollments: number;
  published_at?: string;
  chapters?: ChapterWithLectures[];
}

export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  short_desc?: string;
  thumbnail_url?: string;
  instructor_name: string;
  instructor_photo_url?: string;
  is_free: boolean;
  price?: number;
  discount_pct?: number;
  language: string;
  level?: string;
  total_lectures: number;
  total_duration: number;
  total_enrollments: number;
}

export interface ChapterWithLectures {
  id: string;
  title: string;
  sort_order: number;
  lectures: LectureItem[];
}

export interface LectureItem {
  id: string;
  title: string;
  description?: string;
  sort_order: number;
  duration?: number;
  is_preview: boolean;
  is_published: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: 'board' | 'class' | 'stream' | 'subject';
  parent_id?: string;
  sort_order: number;
  icon_url?: string;
  is_active: boolean;
}

export interface EnrolledCourse {
  enrollment_id: string;
  course_id: string;
  title: string;
  slug: string;
  thumbnail_url?: string;
  instructor_name: string;
  progress_pct: number;
  enrolled_at: string;
  total_lectures: number;
  completed_lectures: number;
}

export interface StudentDashboard {
  total_enrolled: number;
  total_completed: number;
  total_in_progress: number;
  recent_courses: EnrolledCourse[];
  total_bookmarks: number;
}

export interface BookmarkItem {
  id: string;
  course_id?: string;
  course_title?: string;
  course_slug?: string;
  lecture_id?: string;
  lecture_title?: string;
  created_at: string;
}

export interface PaymentHistoryItem {
  id: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  amount: number;
  discount_amount: number;
  final_amount: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

export interface InstructorDashboard {
  total_courses: number;
  total_students: number;
  total_earnings: number;
  pending_payouts: number;
  courses: InstructorCourseItem[];
}

export interface InstructorCourseItem {
  id: string;
  title: string;
  slug: string;
  status: string;
  total_enrollments: number;
  total_lectures: number;
  created_at: string;
}

export interface EarningsSummary {
  total_earnings: number;
  pending_payouts: number;
  paid_out: number;
  recent_earnings: EarningItem[];
}

export interface EarningItem {
  id: string;
  course_title: string;
  order_amount: number;
  platform_pct: number;
  instructor_amount: number;
  payout_status: string;
  created_at: string;
}

export interface PlatformAnalytics {
  total_users: number;
  total_students: number;
  total_instructors: number;
  total_courses: number;
  published_courses: number;
  total_enrollments: number;
  total_revenue: number;
  platform_earnings: number;
  top_courses: TopCourseItem[];
}

export interface TopCourseItem {
  id: string;
  title: string;
  instructor_name: string;
  total_enrollments: number;
  revenue: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
