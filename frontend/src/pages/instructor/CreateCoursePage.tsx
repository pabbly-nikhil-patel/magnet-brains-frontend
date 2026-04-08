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
    // Cascading category selection
    domain_id: '', level1_id: '', level2_id: '', level3_id: '',
    // Legacy fields for backend compatibility
    board_id: '', class_id: '', stream_id: '', subject_id: '',
    is_free: true, price: '', discount_pct: '',
    language: 'hindi', level: 'beginner',
    syllabus_points: '', tags: '', is_full_course: false,
  });

  useEffect(() => {
    coursesApi.getCategories().then((res) => setCategories(res.data));
  }, []);

  // Cascading category logic
  const domains = categories.filter((c) => c.type === 'domain');
  const selectedDomain = categories.find(c => c.id === form.domain_id);
  const isAcademic = selectedDomain?.slug === 'academic';

  const level1Options = form.domain_id
    ? categories.filter(c => c.parent_id === form.domain_id).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const level2Options = form.level1_id
    ? categories.filter(c => c.parent_id === form.level1_id).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const level3Options = form.level2_id
    ? categories.filter(c => c.parent_id === form.level2_id).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  // Labels change based on domain
  const getLabels = () => {
    if (isAcademic) return { l1: 'Board', l2: 'Class', l3: 'Stream/Subject' };
    return { l1: 'Category', l2: 'Sub-category', l3: 'Specialization' };
  };
  const labels = getLabels();

  const handleDomainChange = (domainId: string) => {
    setForm({ ...form, domain_id: domainId, level1_id: '', level2_id: '', level3_id: '', board_id: '', class_id: '', stream_id: '', subject_id: '' });
  };

  const handleLevel1Change = (id: string) => {
    const updates: Record<string, string> = { level1_id: id, level2_id: '', level3_id: '' };
    if (isAcademic) updates.board_id = id;
    setForm({ ...form, ...updates, class_id: '', stream_id: '', subject_id: '' });
  };

  const handleLevel2Change = (id: string) => {
    const updates: Record<string, string> = { level2_id: id, level3_id: '' };
    if (isAcademic) updates.class_id = id;
    setForm({ ...form, ...updates, stream_id: '', subject_id: '' });
  };

  const handleLevel3Change = (id: string) => {
    const updates: Record<string, string> = { level3_id: id };
    if (isAcademic) updates.stream_id = id;
    setForm({ ...form, ...updates });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        short_desc: form.short_desc || undefined,
        board_id: form.board_id || form.level1_id || undefined,
        class_id: form.class_id || form.level2_id || undefined,
        stream_id: form.stream_id || form.level3_id || undefined,
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
      <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-3xl">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium mb-1">Course Title *</label>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input-field" required placeholder="e.g., Complete Physics Class 12 CBSE" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Short Description</label>
          <input type="text" value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })}
            className="input-field" maxLength={500} placeholder="Brief one-liner about the course" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Full Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4} className="input-field" placeholder="Detailed course description..." />
        </div>

        {/* Category Selection - Cascading */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-semibold text-sm mb-3">Course Category</h3>

          {/* Domain */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Domain *</label>
            <div className="flex flex-wrap gap-2">
              {domains.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleDomainChange(d.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.domain_id === d.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-gray-200 hover:border-primary hover:text-primary'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>

          {/* Level 1 */}
          {level1Options.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">{labels.l1}</label>
              <select value={form.level1_id} onChange={(e) => handleLevel1Change(e.target.value)} className="input-field">
                <option value="">Select {labels.l1}</option>
                {level1Options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Level 2 */}
          {level2Options.length > 0 && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">{labels.l2}</label>
              <select value={form.level2_id} onChange={(e) => handleLevel2Change(e.target.value)} className="input-field">
                <option value="">Select {labels.l2}</option>
                {level2Options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Level 3 */}
          {level3Options.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{labels.l3}</label>
              <select value={form.level3_id} onChange={(e) => handleLevel3Change(e.target.value)} className="input-field">
                <option value="">Select {labels.l3}</option>
                {level3Options.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Language & Level */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Language</label>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input-field">
              <option value="hindi">Hindi</option>
              <option value="english">English</option>
              <option value="hinglish">Hinglish</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Difficulty Level</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input-field">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Pricing */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Free Course</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_full_course} onChange={(e) => setForm({ ...form, is_full_course: e.target.checked })} className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Full Course</span>
          </label>
        </div>

        {!form.is_free && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price (INR)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="input-field" min="0" step="1" placeholder="499" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount %</label>
              <input type="number" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                className="input-field" min="0" max="100" placeholder="20" />
            </div>
          </div>
        )}

        {/* Syllabus & Tags */}
        <div>
          <label className="block text-sm font-medium mb-1">Syllabus Points (one per line)</label>
          <textarea value={form.syllabus_points} onChange={(e) => setForm({ ...form, syllabus_points: e.target.value })}
            rows={3} className="input-field" placeholder="What students will learn..." />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className="input-field" placeholder="physics, cbse, class 12, board exam" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-lg">
          {loading ? 'Creating...' : 'Create Course'}
        </button>
      </form>
    </DashboardLayout>
  );
}
