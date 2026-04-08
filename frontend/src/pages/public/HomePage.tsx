import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, PlayCircle, Award, Users, MessageCircle, Video } from 'lucide-react';
import { coursesApi } from '../../api/courses';
import { useCourseStore } from '../../stores/courseStore';
import CourseCard from '../../components/shared/CourseCard';
import type { CourseListItem, Category } from '../../types';

export default function HomePage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const { categories, setCategories } = useCourseStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: '8' }),
      coursesApi.getCategories(),
    ]).then(([coursesRes, catRes]) => {
      setCourses(coursesRes.data.data);
      setCategories(catRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const boards = categories.filter((c) => c.type === 'board');

  const features = [
    { icon: <BookOpen className="w-8 h-8" />, label: '100% Free Quality Education' },
    { icon: <PlayCircle className="w-8 h-8" />, label: 'Recorded Video Lectures' },
    { icon: <Award className="w-8 h-8" />, label: '100% Complete Syllabus' },
    { icon: <MessageCircle className="w-8 h-8" />, label: 'Doubt Solving Sessions' },
    { icon: <Video className="w-8 h-8" />, label: 'Live Interactive Classes' },
    { icon: <Users className="w-8 h-8" />, label: 'Exam Preparation Videos' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary to-orange-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Free Online Education</h1>
          <p className="text-lg mb-8 opacity-90">
            High-Quality Video Lectures for All Classes & Boards
          </p>
          <Link to="/courses" className="bg-white text-primary px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors">
            Explore Courses
          </Link>
        </div>
      </section>

      {/* Boards Navigation */}
      {boards.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/browse/${board.slug}`}
                className="px-4 py-2 bg-white rounded-full border hover:border-primary hover:text-primary transition-colors text-sm font-medium"
              >
                {board.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Course Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-8 text-center">Explore Top Courses</h2>
        {loading ? (
          <p className="text-center text-gray-500">Loading courses...</p>
        ) : courses.length === 0 ? (
          <p className="text-center text-gray-500">No courses available yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link to="/courses" className="btn-primary">View All Courses</Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">What We Offer</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4">
                <div className="text-primary mb-3">{f.icon}</div>
                <p className="font-medium text-sm">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
