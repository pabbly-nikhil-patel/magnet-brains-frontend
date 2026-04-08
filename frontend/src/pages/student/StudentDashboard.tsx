import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle, Clock, Bookmark } from 'lucide-react';
import { studentApi } from '../../api/student';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { StudentDashboard as DashboardType } from '../../types';

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.getDashboard().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!data) return null;

  const stats = [
    { label: 'Enrolled Courses', value: data.total_enrolled, icon: <BookOpen className="w-6 h-6" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Completed', value: data.total_completed, icon: <CheckCircle className="w-6 h-6" />, color: 'text-green-600 bg-green-50' },
    { label: 'In Progress', value: data.total_in_progress, icon: <Clock className="w-6 h-6" />, color: 'text-orange-600 bg-orange-50' },
    { label: 'Bookmarks', value: data.total_bookmarks, icon: <Bookmark className="w-6 h-6" />, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Student Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              {s.icon}
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Recent Courses</h2>
      {data.recent_courses.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="btn-primary">Browse Courses</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.recent_courses.map((course) => (
            <Link key={course.enrollment_id} to={`/courses/${course.slug}`} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-20 h-14 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                {course.thumbnail_url && <img src={course.thumbnail_url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{course.title}</h3>
                <p className="text-xs text-gray-500">{course.instructor_name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-primary">{course.progress_pct}%</p>
                <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${course.progress_pct}%` }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
