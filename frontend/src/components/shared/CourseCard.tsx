import { Link } from 'react-router-dom';
import { Clock, Users, BookOpen } from 'lucide-react';
import type { CourseListItem } from '../../types';

interface Props {
  course: CourseListItem;
}

export default function CourseCard({ course }: Props) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPrice = () => {
    if (course.is_free) return <span className="text-green-600 font-bold">FREE</span>;
    const discounted = course.discount_pct
      ? course.price! * (1 - course.discount_pct / 100)
      : course.price;
    return (
      <span className="font-bold text-dark">
        ₹{discounted?.toFixed(0)}
        {course.discount_pct ? (
          <span className="text-sm text-gray-400 line-through ml-1">₹{course.price}</span>
        ) : null}
      </span>
    );
  };

  return (
    <Link to={`/courses/${course.slug}`} className="card group hover:shadow-md transition-shadow">
      <div className="aspect-video bg-gray-200 relative overflow-hidden">
        {course.thumbnail_url ? (
          <img
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <BookOpen className="w-12 h-12" />
          </div>
        )}
        {course.is_free && (
          <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
            FREE
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {course.title}
        </h3>
        <p className="text-xs text-gray-500 mb-2">{course.instructor_name}</p>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" /> {course.total_lectures} lectures
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDuration(course.total_duration)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {course.total_enrollments}
          </span>
        </div>
        <div className="flex items-center justify-between">
          {getPrice()}
          {course.level && (
            <span className="text-xs text-gray-400 capitalize">{course.level}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
