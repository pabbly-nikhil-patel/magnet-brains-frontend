import { useEffect, useState } from 'react';
import { Users, BookOpen, DollarSign, BarChart3 } from 'lucide-react';
import { adminApi } from '../../api/admin';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { PlatformAnalytics } from '../../types';

export default function AdminDashboard() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getAnalytics().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!data) return null;

  const stats = [
    { label: 'Total Users', value: data.total_users, sub: `${data.total_students} students, ${data.total_instructors} instructors`, icon: <Users className="w-6 h-6" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Courses', value: data.total_courses, sub: `${data.published_courses} published`, icon: <BookOpen className="w-6 h-6" />, color: 'text-green-600 bg-green-50' },
    { label: 'Total Revenue', value: `₹${data.total_revenue.toFixed(0)}`, sub: `Platform: ₹${data.platform_earnings.toFixed(0)}`, icon: <DollarSign className="w-6 h-6" />, color: 'text-orange-600 bg-orange-50' },
    { label: 'Enrollments', value: data.total_enrollments, sub: 'Total enrollments', icon: <BarChart3 className="w-6 h-6" />, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>{s.icon}</div>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold mb-4">Top Courses</h2>
      {data.top_courses.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Course</th>
                <th className="text-left px-4 py-3 font-medium">Instructor</th>
                <th className="text-left px-4 py-3 font-medium">Enrollments</th>
                <th className="text-left px-4 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.top_courses.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-gray-500">{c.instructor_name}</td>
                  <td className="px-4 py-3">{c.total_enrollments}</td>
                  <td className="px-4 py-3">₹{c.revenue.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
