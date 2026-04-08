import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Upload, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { instructorApi } from '../../api/instructor';
import { coursesApi } from '../../api/courses';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Course } from '../../types';

export default function EditCoursePage() {
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [newChapter, setNewChapter] = useState('');
  const [newLectures, setNewLectures] = useState<Record<string, string>>({});

  const load = async () => {
    if (!id) return;
    // We need to fetch the course by ID — use the slug from instructor courses list
    // For simplicity, fetch instructor courses and find by ID
    try {
      const res = await instructorApi.listCourses();
      const found = res.data.find((c) => c.id === id);
      if (found) {
        const detail = await coursesApi.getBySlug(found.slug);
        setCourse(detail.data);
      }
    } catch {
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleAddChapter = async () => {
    if (!newChapter.trim() || !id) return;
    try {
      await instructorApi.createChapter(id, { title: newChapter });
      setNewChapter('');
      toast.success('Chapter added');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add chapter');
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Delete this chapter and all its lectures?')) return;
    try {
      await instructorApi.deleteChapter(chapterId);
      toast.success('Chapter deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete chapter');
    }
  };

  const handleAddLecture = async (chapterId: string) => {
    const title = newLectures[chapterId];
    if (!title?.trim()) return;
    try {
      await instructorApi.createLecture(chapterId, { title });
      setNewLectures((prev) => ({ ...prev, [chapterId]: '' }));
      toast.success('Lecture added');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add lecture');
    }
  };

  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm('Delete this lecture?')) return;
    try {
      await instructorApi.deleteLecture(lectureId);
      toast.success('Lecture deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete lecture');
    }
  };

  const handleVideoUpload = async (lectureId: string, file: File) => {
    try {
      const { data } = await instructorApi.getPresignedUrl({
        file_name: file.name,
        content_type: file.type,
        upload_type: 'video',
      });

      // Upload to S3
      await fetch(data.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      // Update lecture with S3 key
      await instructorApi.updateLecture(lectureId, {
        video_s3_key: data.s3_key,
        video_url: data.public_url,
        video_status: 'ready',
      });

      toast.success('Video uploaded!');
      load();
    } catch {
      toast.error('Video upload failed');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  if (!course) return <DashboardLayout><p>Course not found.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-2">{course.title}</h1>
      <p className="text-gray-500 text-sm mb-6">Manage chapters and lectures</p>

      {/* Add chapter */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          placeholder="New chapter title..."
          className="input-field flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAddChapter()}
        />
        <button onClick={handleAddChapter} className="btn-primary text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Chapter
        </button>
      </div>

      {/* Chapters & lectures */}
      <div className="space-y-4">
        {course.chapters?.map((chapter) => (
          <div key={chapter.id} className="card">
            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-400" />
                <h3 className="font-medium">{chapter.title}</h3>
                <span className="text-xs text-gray-500">({chapter.lectures.length} lectures)</span>
              </div>
              <button onClick={() => handleDeleteChapter(chapter.id)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {chapter.lectures.map((lecture) => (
                <div key={lecture.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium">{lecture.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      {lecture.is_preview && <span className="badge-blue">Preview</span>}
                      {lecture.duration && <span>{Math.floor(lecture.duration / 60)}m</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer p-1 text-blue-600 hover:bg-blue-50 rounded" title="Upload video">
                      <Upload className="w-4 h-4" />
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleVideoUpload(lecture.id, file);
                        }}
                      />
                    </label>
                    <button onClick={() => handleDeleteLecture(lecture.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add lecture */}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newLectures[chapter.id] || ''}
                  onChange={(e) => setNewLectures((prev) => ({ ...prev, [chapter.id]: e.target.value }))}
                  placeholder="New lecture title..."
                  className="input-field flex-1 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLecture(chapter.id)}
                />
                <button onClick={() => handleAddLecture(chapter.id)} className="btn-outline text-sm">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
