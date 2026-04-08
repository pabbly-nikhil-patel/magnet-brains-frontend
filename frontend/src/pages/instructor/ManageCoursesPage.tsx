import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Edit, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { instructorApi } from '../../api/instructor';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import StatusBadge from '../../components/shared/StatusBadge';
import type { InstructorCourseItem } from '../../types';

export default function ManageCoursesPage() {
  const [courses, setCourses] = useState<InstructorCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    instructorApi.listCourses().then((res) => setCourses(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft course?')) return;
    try {
      await instructorApi.deleteCourse(id);
      toast.success('Course deleted');
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await instructorApi.submitCourse(id);
      toast.success('Course submitted for review');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Submit failed');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Courses</h1>
        <Link to="/instructor/courses/new" className="btn-primary text-sm">+ Create Course</Link>
      </div>

      {courses.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">No courses yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{course.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <StatusBadge status={course.status} />
                  <span>{course.total_enrollments} students</span>
                  <span>{course.total_lectures} lectures</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {course.status === 'draft' && (
                  <button onClick={() => handleSubmit(course.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="Submit for review">
                    <Send className="w-4 h-4" />
                  </button>
                )}
                <Link to={`/instructor/courses/${course.id}/edit`} className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                  <Edit className="w-4 h-4" />
                </Link>
                {course.status === 'draft' && (
                  <button onClick={() => handleDelete(course.id)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
