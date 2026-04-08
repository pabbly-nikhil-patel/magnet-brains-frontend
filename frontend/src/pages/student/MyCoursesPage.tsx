import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { studentApi } from '../../api/student';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { EnrolledCourse } from '../../types';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.listEnrollments().then((res) => setCourses(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">My Courses</h1>

      {courses.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">No courses yet.</p>
          <Link to="/courses" className="btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link key={course.enrollment_id} to={`/courses/${course.slug}`} className="card hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-200">
                {course.thumbnail_url && <img src={course.thumbnail_url} className="w-full h-full object-cover" />}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{course.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{course.instructor_name}</p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>{course.completed_lectures}/{course.total_lectures} lectures</span>
                  <span className="font-bold text-primary">{course.progress_pct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${course.progress_pct}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
