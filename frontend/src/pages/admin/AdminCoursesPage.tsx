import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import StatusBadge from '../../components/shared/StatusBadge';

interface AdminCourse {
  id: string; title: string; slug: string; instructor_name: string;
  status: string; is_free: boolean; price?: number; total_enrollments: number; created_at: string;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    adminApi.listCourses(params).then((res) => setCourses(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveCourse(id);
      toast.success('Course approved');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await adminApi.rejectCourse(id, reason);
      toast.success('Course rejected');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Course Management</h1>

      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Instructor</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Students</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-gray-500">{c.instructor_name}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">{c.is_free ? <span className="text-green-600">Free</span> : `₹${c.price}`}</td>
                  <td className="px-4 py-3">{c.total_enrollments}</td>
                  <td className="px-4 py-3">
                    {c.status === 'pending_review' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(c.id)} className="text-green-600 hover:underline text-sm">Approve</button>
                        <button onClick={() => handleReject(c.id)} className="text-red-600 hover:underline text-sm">Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
