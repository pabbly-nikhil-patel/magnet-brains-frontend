import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentApi } from '../../api/student';
import DashboardLayout from '../../components/shared/DashboardLayout';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { BookmarkItem } from '../../types';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.listBookmarks().then((res) => setBookmarks(res.data)).finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await studentApi.removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to remove bookmark');
    }
  };

  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Bookmarks</h1>

      {bookmarks.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500">No bookmarks yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="card p-4 flex items-center justify-between">
              <div>
                {bm.course_title && (
                  <Link to={`/courses/${bm.course_slug}`} className="font-medium text-sm hover:text-primary">
                    {bm.course_title}
                  </Link>
                )}
                {bm.lecture_title && (
                  <p className="text-xs text-gray-500">Lecture: {bm.lecture_title}</p>
                )}
                <p className="text-xs text-gray-400">{new Date(bm.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleRemove(bm.id)} className="text-red-500 hover:text-red-700 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
