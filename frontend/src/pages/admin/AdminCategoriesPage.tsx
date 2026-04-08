import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin';
import { coursesApi } from '../../api/courses';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Category } from '../../types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'board' as string, parent_id: '', sort_order: '0' });

  const load = () => {
    coursesApi.getCategories().then((res) => setCategories(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      await adminApi.createCategory({
        name: form.name,
        type: form.type,
        parent_id: form.parent_id || undefined,
        sort_order: parseInt(form.sort_order) || 0,
      });
      toast.success('Category created');
      setForm({ name: '', type: 'board', parent_id: '', sort_order: '0' });
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await adminApi.deleteCategory(id);
      toast.success('Category deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const grouped = {
    board: categories.filter((c) => c.type === 'board'),
    class: categories.filter((c) => c.type === 'class'),
    stream: categories.filter((c) => c.type === 'stream'),
    subject: categories.filter((c) => c.type === 'subject'),
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Category Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {showForm && (
        <div className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
              <option value="board">Board</option>
              <option value="class">Class</option>
              <option value="stream">Stream</option>
              <option value="subject">Subject</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Parent</label>
            <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} className="input-field">
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Order</label>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              className="input-field w-20" />
          </div>
          <button onClick={handleCreate} className="btn-primary text-sm">Create</button>
        </div>
      )}

      {(['board', 'class', 'stream', 'subject'] as const).map((type) => (
        <div key={type} className="mb-6">
          <h2 className="text-lg font-bold mb-3 capitalize">{type}s</h2>
          {grouped[type].length === 0 ? (
            <p className="text-gray-500 text-sm">No {type}s yet.</p>
          ) : (
            <div className="space-y-2">
              {grouped[type].map((cat) => (
                <div key={cat.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{cat.name}</span>
                    <span className="text-xs text-gray-400 ml-2">/{cat.slug}</span>
                    {cat.parent_id && (
                      <span className="text-xs text-gray-400 ml-2">
                        (parent: {categories.find((c) => c.id === cat.parent_id)?.name})
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(cat.id)} className="text-red-500 hover:text-red-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </DashboardLayout>
  );
}
