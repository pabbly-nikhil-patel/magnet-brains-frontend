import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { instructorApi } from '../../api/instructor';
import { coursesApi } from '../../api/courses';
import DashboardLayout from '../../components/shared/DashboardLayout';
import type { Category } from '../../types';

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', short_desc: '',
    board_id: '', class_id: '', stream_id: '', subject_id: '',
    is_free: true, price: '', discount_pct: '',
    language: 'hindi', level: 'beginner',
    syllabus_points: '', tags: '', is_full_course: false,
  });

  useEffect(() => {
    coursesApi.getCategories().then((res) => setCategories(res.data));
  }, []);

  const boards = categories.filter((c) => c.type === 'board');
  const classes = categories.filter((c) => c.type === 'class' && (!form.board_id || c.parent_id === form.board_id));
  const streams = categories.filter((c) => c.type === 'stream' && (!form.class_id || c.parent_id === form.class_id));
  const subjects = categories.filter((c) => c.type === 'subject');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        short_desc: form.short_desc || undefined,
        board_id: form.board_id || undefined,
        class_id: form.class_id || undefined,
        stream_id: form.stream_id || undefined,
        subject_id: form.subject_id || undefined,
        is_free: form.is_free,
        price: form.price ? parseFloat(form.price) : undefined,
        discount_pct: form.discount_pct ? parseInt(form.discount_pct) : undefined,
        language: form.language,
        level: form.level,
        syllabus_points: form.syllabus_points ? form.syllabus_points.split('\n').filter(Boolean) : undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        is_full_course: form.is_full_course,
      };
      const res = await instructorApi.createCourse(data);
      toast.success('Course created!');
      navigate(`/instructor/courses/${res.data.id}/edit`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Create New Course</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4 max-w-3xl">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short Description</label>
          <input type="text" value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })}
            className="input-field" maxLength={500} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Full Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Board</label>
            <select value={form.board_id} onChange={(e) => setForm({ ...form, board_id: e.target.value, class_id: '', stream_id: '' })} className="input-field">
              <option value="">Select Board</option>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value, stream_id: '' })} className="input-field">
              <option value="">Select Class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stream</label>
            <select value={form.stream_id} onChange={(e) => setForm({ ...form, stream_id: e.target.value })} className="input-field">
              <option value="">Select Stream</option>
              {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="input-field">
              <option value="">Select Subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input-field">
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input-field">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
            <span className="text-sm">Free Course</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_full_course} onChange={(e) => setForm({ ...form, is_full_course: e.target.checked })} />
            <span className="text-sm">Full Course</span>
          </label>
        </div>

        {!form.is_free && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (₹)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input-field" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount %</label>
              <input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                className="input-field" min="0" max="100" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Syllabus Points (one per line)</label>
          <textarea value={form.syllabus_points} onChange={(e) => setForm({ ...form, syllabus_points: e.target.value })}
            rows={3} className="input-field" placeholder="Point 1&#10;Point 2" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="input-field" placeholder="physics, cbse, class 12" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Course'}
        </button>
      </form>
    </DashboardLayout>
  );
}
