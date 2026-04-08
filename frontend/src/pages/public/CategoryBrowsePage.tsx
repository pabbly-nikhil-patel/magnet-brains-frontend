import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, BookOpen, ArrowLeft } from 'lucide-react';
import { coursesApi } from '../../api/courses';
import CourseCard from '../../components/shared/CourseCard';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Category, CourseListItem } from '../../types';

export default function CategoryBrowsePage() {
  const params = useParams<{ '*': string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Parse the URL path segments
  const pathSegments = (params['*'] || '').split('/').filter(Boolean);
  const currentSlug = pathSegments[pathSegments.length - 1] || '';

  useEffect(() => {
    setLoading(true);
    coursesApi.getCategories().then((res) => {
      setCategories(res.data);

      // If we have a current slug, try to load courses for it
      if (currentSlug) {
        coursesApi.getCategoryCourses(currentSlug).then(r => setCourses(r.data.data)).catch(() => setCourses([]));
      } else {
        setCourses([]);
      }
    }).finally(() => setLoading(false));
  }, [currentSlug]);

  // Find current category
  const currentCategory = currentSlug ? categories.find(c => c.slug === currentSlug) : null;

  // Get children of current category (or top-level domains if no slug)
  const getChildren = () => {
    if (!currentSlug) {
      return categories.filter(c => c.type === 'domain');
    }
    if (currentCategory) {
      return categories
        .filter(c => c.parent_id === currentCategory.id)
        .sort((a, b) => a.sort_order - b.sort_order);
    }
    return [];
  };

  const children = getChildren();

  // Build breadcrumbs by walking up the parent chain
  const buildBreadcrumbs = () => {
    const crumbs: { label: string; path: string }[] = [
      { label: 'Home', path: '/' },
      { label: 'Browse', path: '/browse' },
    ];

    if (pathSegments.length > 0) {
      let path = '/browse';
      for (const seg of pathSegments) {
        const cat = categories.find(c => c.slug === seg);
        path += `/${seg}`;
        crumbs.push({ label: cat?.name || seg, path });
      }
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  // Build path for a child category
  const getChildPath = (child: Category) => {
    const basePath = pathSegments.length > 0 ? `/browse/${pathSegments.join('/')}` : '/browse';
    return `${basePath}/${child.slug}`;
  };

  const getCategoryEmoji = (type: string) => {
    switch (type) {
      case 'domain': return '📂';
      case 'topic': case 'board': return '📚';
      case 'subtopic': case 'class': return '📖';
      case 'stream': return '🔬';
      case 'subject': return '📝';
      default: return '📁';
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
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
      {pathSegments.length > 0 && (
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">
          {currentCategory?.name || 'Browse All Categories'}
        </h1>
        {currentCategory?.description && (
          <p className="text-gray-500">{currentCategory.description}</p>
        )}
        {!currentCategory && (
          <p className="text-gray-500">Explore courses across academics, government exams, competitive exams, and skills</p>
        )}
      </div>

      {/* Category cards */}
      {children.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {children.map((child) => {
            const grandchildren = categories.filter(c => c.parent_id === child.id);
            return (
              <Link
                key={child.id}
                to={getChildPath(child)}
                className="card p-5 hover:shadow-md transition-all hover:border-primary/30 group"
              >
                <div className="text-2xl mb-2">{getCategoryEmoji(child.type)}</div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors mb-1">
                  {child.name}
                </h3>
                {child.description && (
                  <p className="text-xs text-gray-500 mb-2 line-clamp-2">{child.description}</p>
                )}
                {grandchildren.length > 0 && (
                  <p className="text-xs text-gray-400">{grandchildren.length} subcategories</p>
                )}
                <div className="flex items-center gap-1 text-sm text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Explore</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Courses */}
      {courses.length > 0 && (
        <div>
          {children.length > 0 && <h2 className="text-xl font-bold mb-4">Courses</h2>}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {children.length === 0 && courses.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">No courses available in this category yet.</p>
          <p className="text-gray-400 text-sm mb-4">Courses will appear here once instructors publish them.</p>
          <Link to="/browse" className="btn-primary inline-block">Browse All Categories</Link>
        </div>
      )}
    </div>
  );
}
