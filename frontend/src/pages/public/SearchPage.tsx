import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { coursesApi } from '../../api/courses';
import CourseCard from '../../components/shared/CourseCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { CourseListItem } from '../../types';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (q.trim()) {
      setLoading(true);
      coursesApi.search(q).then((res) => {
        setCourses(res.data.data);
        setTotal(res.data.pagination.total);
      }).finally(() => setLoading(false));
    }
  }, [q]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Search Results</h1>
      <p className="text-gray-500 mb-6">
        {total} results for "{q}"
      </p>

      {loading ? (
        <LoadingSpinner />
      ) : courses.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No courses found for "{q}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
