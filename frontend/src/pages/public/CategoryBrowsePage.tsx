import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, ArrowLeft } from 'lucide-react';
import { coursesApi } from '../../api/courses';
import CourseCard from '../../components/shared/CourseCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Category, CourseListItem } from '../../types';

export default function CategoryBrowsePage() {
  const { boardSlug, classSlug, streamSlug, subjectSlug } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);

  useEffect(() => {
    setLoading(true);
    coursesApi.getCategories().then((res) => {
      const cats = res.data;
      setCategories(cats);

      // Determine what level we're at and what to show
      if (subjectSlug) {
        // Show courses for this subject
        const subject = cats.find(c => c.slug === subjectSlug);
        setCurrentCategory(subject || null);
        coursesApi.getCategoryCourses(subjectSlug).then(r => setCourses(r.data.data));
      } else if (streamSlug) {
        // Show subjects under this stream (or courses if no subjects)
        const stream = cats.find(c => c.slug === streamSlug);
        setCurrentCategory(stream || null);
        // Also load courses for this stream
        coursesApi.getCategoryCourses(streamSlug).then(r => setCourses(r.data.data));
      } else if (classSlug) {
        const cls = cats.find(c => c.slug === classSlug);
        setCurrentCategory(cls || null);
        coursesApi.getCategoryCourses(classSlug).then(r => setCourses(r.data.data));
      } else if (boardSlug) {
        const board = cats.find(c => c.slug === boardSlug);
        setCurrentCategory(board || null);
        coursesApi.getCategoryCourses(boardSlug).then(r => setCourses(r.data.data));
      }
    }).finally(() => setLoading(false));
  }, [boardSlug, classSlug, streamSlug, subjectSlug]);

  // Get children of current level
  const getChildren = () => {
    if (subjectSlug) return []; // Leaf level — show courses
    if (streamSlug) {
      const stream = categories.find(c => c.slug === streamSlug);
      return categories.filter(c => c.type === 'subject' && c.parent_id === stream?.id);
    }
    if (classSlug) {
      const cls = categories.find(c => c.slug === classSlug);
      return categories.filter(c => c.type === 'stream' && c.parent_id === cls?.id);
    }
    if (boardSlug) {
      const board = categories.find(c => c.slug === boardSlug);
      return categories.filter(c => c.type === 'class' && c.parent_id === board?.id);
    }
    return categories.filter(c => c.type === 'board');
  };

  const children = getChildren();

  // Build breadcrumb
  const breadcrumbs: { label: string; path: string }[] = [
    { label: 'Home', path: '/' },
    { label: 'Browse', path: '/browse' },
  ];
  if (boardSlug) {
    const board = categories.find(c => c.slug === boardSlug);
    breadcrumbs.push({ label: board?.name || boardSlug, path: `/browse/${boardSlug}` });
  }
  if (classSlug) {
    const cls = categories.find(c => c.slug === classSlug);
    breadcrumbs.push({ label: cls?.name || classSlug, path: `/browse/${boardSlug}/${classSlug}` });
  }
  if (streamSlug) {
    const stream = categories.find(c => c.slug === streamSlug);
    breadcrumbs.push({ label: stream?.name || streamSlug, path: `/browse/${boardSlug}/${classSlug}/${streamSlug}` });
  }
  if (subjectSlug) {
    const subject = categories.find(c => c.slug === subjectSlug);
    breadcrumbs.push({ label: subject?.name || subjectSlug, path: `/browse/${boardSlug}/${classSlug}/${streamSlug}/${subjectSlug}` });
  }

  // Build child link path
  const getChildPath = (child: Category) => {
    if (!boardSlug) return `/browse/${child.slug}`;
    if (!classSlug) return `/browse/${boardSlug}/${child.slug}`;
    if (!streamSlug) return `/browse/${boardSlug}/${classSlug}/${child.slug}`;
    return `/browse/${boardSlug}/${classSlug}/${streamSlug}/${child.slug}`;
  };

  const getLevelLabel = () => {
    if (subjectSlug) return 'Courses';
    if (streamSlug) return 'Select Subject';
    if (classSlug) return 'Select Stream';
    if (boardSlug) return 'Select Class';
    return 'Select Board';
  };

  const getLevelIcon = (type: string) => {
    switch (type) {
      case 'board': return '🏫';
      case 'class': return '📚';
      case 'stream': return '🔬';
      case 'subject': return '📖';
      default: return '📁';
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        {breadcrumbs.map((bc, i) => (
          <span key={bc.path} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            {i === breadcrumbs.length - 1 ? (
              <span className="text-dark font-medium">{bc.label}</span>
            ) : (
              <Link to={bc.path} className="hover:text-primary">{bc.label}</Link>
            )}
          </span>
        ))}
      </nav>

      {/* Back button */}
      {boardSlug && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      {/* Current level header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {currentCategory?.name || 'Browse Courses'}
        </h1>
        <p className="text-gray-500">{getLevelLabel()}</p>
      </div>

      {/* Category cards (if not at leaf level) */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {children.map((child) => (
            <Link
              key={child.id}
              to={getChildPath(child)}
              className="card p-6 hover:shadow-md transition-all hover:border-primary group"
            >
              <div className="text-3xl mb-3">{getLevelIcon(child.type)}</div>
              <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                {child.name}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-2">
                <span>Explore</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Courses grid (shown at stream/subject level or when no children) */}
      {(children.length === 0 || streamSlug || subjectSlug) && courses.length > 0 && (
        <div>
          {children.length > 0 && (
            <h2 className="text-xl font-bold mb-4 mt-6">Courses</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {/* No courses message */}
      {children.length === 0 && courses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No courses available in this category yet.</p>
          <Link to="/browse" className="btn-primary mt-4 inline-block">Browse All Categories</Link>
        </div>
      )}
    </div>
  );
}
