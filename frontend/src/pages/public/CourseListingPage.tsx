import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesApi } from '../../api/courses';
import CourseCard from '../../components/shared/CourseCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { CourseListItem } from '../../types';

export default function CourseListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(total / 20);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    searchParams.forEach((value, key) => { params[key] = value; });

    coursesApi.list(params).then((res) => {
      setCourses(res.data.data);
      setTotal(res.data.pagination.total);
    }).finally(() => setLoading(false));
  }, [searchParams, page]);

  const board = searchParams.get('board');
  const cls = searchParams.get('class');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          {board ? `Courses - ${board}` : cls ? `Courses - ${cls}` : 'All Courses'}
        </h1>
        <p className="text-gray-500">{total} courses found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="input-field w-auto"
          value={searchParams.get('is_free') || ''}
          onChange={(e) => {
            const p = new URLSearchParams(searchParams);
            if (e.target.value) p.set('is_free', e.target.value);
            else p.delete('is_free');
            setSearchParams(p);
          }}
        >
          <option value="">All (Free & Paid)</option>
          <option value="true">Free Only</option>
          <option value="false">Paid Only</option>
        </select>

        <select
          className="input-field w-auto"
          value={searchParams.get('level') || ''}
          onChange={(e) => {
            const p = new URLSearchParams(searchParams);
            if (e.target.value) p.set('level', e.target.value);
            else p.delete('level');
            setSearchParams(p);
          }}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <select
          className="input-field w-auto"
          value={searchParams.get('language') || ''}
          onChange={(e) => {
            const p = new URLSearchParams(searchParams);
            if (e.target.value) p.set('language', e.target.value);
            else p.delete('language');
            setSearchParams(p);
          }}
        >
          <option value="">All Languages</option>
          <option value="hindi">Hindi</option>
          <option value="english">English</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : courses.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No courses found matching your filters.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-outline text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-outline text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
