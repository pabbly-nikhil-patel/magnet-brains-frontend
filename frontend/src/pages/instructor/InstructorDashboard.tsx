import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, DollarSign, Clock } from 'lucide-react';
import { instructorApi } from '../../api/instructor';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import StatusBadge from '../../components/shared/StatusBadge';
import type { InstructorDashboard as DashType } from '../../types';

export default function InstructorDashboardPage() {
  const [data, setData] = useState<DashType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    instructorApi.getDashboard().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!data) return null;

  const stats = [
    { label: 'Total Courses', value: data.total_courses, icon: <BookOpen className="w-6 h-6" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Students', value: data.total_students, icon: <Users className="w-6 h-6" />, color: 'text-green-600 bg-green-50' },
    { label: 'Total Earnings', value: `₹${data.total_earnings.toFixed(0)}`, icon: <DollarSign className="w-6 h-6" />, color: 'text-orange-600 bg-orange-50' },
    { label: 'Pending Payouts', value: `₹${data.pending_payouts.toFixed(0)}`, icon: <Clock className="w-6 h-6" />, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
        <Link to="/instructor/courses/new" className="btn-primary text-sm">+ Create Course</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Your Courses</h2>
      {data.courses.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 mb-4">You haven't created any courses yet.</p>
          <Link to="/instructor/courses/new" className="btn-primary">Create Your First Course</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Students</th>
                <th className="text-left px-4 py-3 font-medium">Lectures</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">{c.total_enrollments}</td>
                  <td className="px-4 py-3">{c.total_lectures}</td>
                  <td className="px-4 py-3">
                    <Link to={`/instructor/courses/${c.id}/edit`} className="text-primary hover:underline text-sm">Edit</Link>
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
