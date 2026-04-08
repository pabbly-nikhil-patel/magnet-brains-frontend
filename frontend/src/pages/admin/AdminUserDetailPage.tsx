import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, BookOpen, Users, DollarSign, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import api from '../../api/client';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import StatusBadge from '../../components/shared/StatusBadge';

interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface UserCourse {
  id: string;
  title: string;
  slug: string;
  status: string;
  total_enrollments: number;
  total_lectures: number;
  created_at: string;
}

interface UserEnrollment {
  course_id: string;
  title: string;
  slug: string;
  progress_pct: number;
  enrolled_at: string;
}

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [courses, setCourses] = useState<UserCourse[]>([]);
  const [enrollments, setEnrollments] = useState<UserEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Fetch user details via admin API (we query directly)
    Promise.all([
      api.get(`/admin/users?search=${id}`),
    ]).then(([usersRes]) => {
      // Find user by ID from the results
      const found = usersRes.data.find((u: any) => u.id === id);
      if (found) setUser(found);
    }).finally(() => setLoading(false));

    // Fetch user's courses (if instructor) or enrollments (if student)
    api.get(`/admin/courses?instructor_id=${id}`).then(res => setCourses(res.data)).catch(() => {});
  }, [id]);

  const handleRoleChange = async (role: string) => {
    if (!id) return;
    try {
      await adminApi.updateUserRole(id, role);
      toast.success('Role updated');
      setUser(prev => prev ? { ...prev, role } : null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleToggleActive = async () => {
    if (!id || !user) return;
    try {
      await adminApi.toggleUserActive(id, !user.is_active);
      toast.success(user.is_active ? 'User deactivated' : 'User activated');
      setUser(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!user) return <DashboardLayout><p className="text-gray-500">User not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <button onClick={() => navigate('/admin/users')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {/* User Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.full_name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{user.full_name}</h1>
              <span className={user.is_active ? 'badge-green' : 'badge-red'}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="badge-blue capitalize">{user.role}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
                {user.email_verified && <span className="text-green-500 text-xs">(verified)</span>}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(user.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Role: {user.role}</span>
              </div>
            </div>

            {user.bio && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 font-medium">Bio:</p>
                <p className="text-sm text-gray-700">{user.bio}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t">
          <div>
            <label className="text-sm font-medium mr-2">Change Role:</label>
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            onClick={handleToggleActive}
            className={`px-4 py-1.5 rounded text-sm font-medium ${
              user.is_active
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {user.is_active ? 'Deactivate Account' : 'Activate Account'}
          </button>
        </div>
      </div>

      {/* Instructor's Courses */}
      {(user.role === 'instructor' || courses.length > 0) && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" /> Courses ({courses.length})
          </h2>
          {courses.length === 0 ? (
            <p className="text-gray-500 text-sm">No courses created yet.</p>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Title</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Students</th>
                    <th className="text-left px-4 py-2 font-medium">Lectures</th>
                    <th className="text-left px-4 py-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {courses.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link to={`/courses/${c.slug}`} className="text-primary hover:underline">{c.title}</Link>
                      </td>
                      <td className="px-4 py-2"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-2">{c.total_enrollments}</td>
                      <td className="px-4 py-2">{c.total_lectures}</td>
                      <td className="px-4 py-2 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
