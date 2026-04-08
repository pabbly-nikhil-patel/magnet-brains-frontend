import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, PlayCircle, Award, Users, MessageCircle, Video,
  ChevronRight, ChevronLeft, GraduationCap, FileText, Download, Star
} from 'lucide-react';
import { coursesApi } from '../../api/courses';
import { useCourseStore } from '../../stores/courseStore';
import CourseCard from '../../components/shared/CourseCard';
import type { CourseListItem, Category } from '../../types';

export default function HomePage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const { categories, setCategories } = useCourseStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filteredCourses, setFilteredCourses] = useState<CourseListItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      coursesApi.list({ limit: '20' }),
      coursesApi.getCategories(),
    ]).then(([coursesRes, catRes]) => {
      setCourses(coursesRes.data.data);
      setFilteredCourses(coursesRes.data.data);
      setCategories(catRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const boards = categories.filter((c) => c.type === 'board');

  // Build tabs from course tags/subjects
  const tabs = [
    { id: 'all', label: 'All Courses' },
    { id: 'physics', label: 'Physics' },
    { id: 'chemistry', label: 'Chemistry' },
    { id: 'mathematics', label: 'Mathematics' },
    { id: 'biology', label: 'Biology' },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'all') {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(c =>
        c.title.toLowerCase().includes(tabId) ||
        (c.short_desc || '').toLowerCase().includes(tabId)
      );
      setFilteredCourses(filtered.length > 0 ? filtered : courses);
    }
  };

  const scrollCourses = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const features = [
    { icon: <BookOpen className="w-7 h-7" />, label: '100% Free Quality Education', desc: 'Access thousands of free video lectures' },
    { icon: <PlayCircle className="w-7 h-7" />, label: 'Recorded Video Lectures', desc: 'Learn at your own pace, anytime' },
    { icon: <Award className="w-7 h-7" />, label: '100% Complete Syllabus', desc: 'Full coverage of all board syllabi' },
    { icon: <MessageCircle className="w-7 h-7" />, label: 'Doubt Solving Sessions', desc: 'Get your questions answered' },
    { icon: <Video className="w-7 h-7" />, label: 'Live Interactive Classes', desc: 'Real-time learning with teachers' },
    { icon: <FileText className="w-7 h-7" />, label: 'E-Notes & Study Material', desc: 'Downloadable notes and papers' },
  ];

  const stats = [
    { value: '10L+', label: 'Students' },
    { value: '500+', label: 'Courses' },
    { value: '50+', label: 'Expert Teachers' },
    { value: '5000+', label: 'Video Lectures' },
  ];

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* Left content */}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Learn Smarter with<br />
                <span className="text-primary">Free Online Education</span>
              </h1>
              <p className="text-gray-300 text-lg mb-6 max-w-lg">
                High-quality video lectures for all classes and boards. Start learning today from India's best teachers.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
                {[
                  { icon: <GraduationCap className="w-5 h-5" />, text: 'CBSE, MP, UP & Bihar Board' },
                  { icon: <PlayCircle className="w-5 h-5" />, text: 'Full Chapter Videos' },
                  { icon: <Award className="w-5 h-5" />, text: 'Complete Syllabus Coverage' },
                  { icon: <Download className="w-5 h-5" />, text: 'Free E-Notes & Papers' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-primary">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <Link to="/courses" className="bg-primary text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors">
                  Explore Courses
                </Link>
                <Link to="/register" className="border border-white/30 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors">
                  Sign Up Free
                </Link>
              </div>
            </div>

            {/* Right - Stats cards */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {stats.map((stat, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 text-center min-w-[140px]">
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-gray-300 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Board Navigation Pills */}
      {boards.length > 0 && (
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-3 justify-center">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/browse/${board.slug}`}
                  className="px-5 py-2 bg-gray-50 rounded-full border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium"
                >
                  {board.name}
                </Link>
              ))}
              <Link
                to="/browse"
                className="px-5 py-2 bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-all text-sm font-medium"
              >
                Browse All &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tabbed Course Section */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Explore Top Courses</h2>
          <p className="text-gray-500">From CBSE to state boards, find the perfect course for you</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-dark hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Horizontal Scrollable Course Cards */}
        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading courses...</p>
        ) : (
          <div className="relative group">
            {/* Scroll buttons */}
            <button
              onClick={() => scrollCourses('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollCourses('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Cards */}
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {filteredCourses.map((course) => (
                <div key={course.id} className="flex-shrink-0 w-72">
                  <CourseCard course={course} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show all link */}
        <div className="mt-6">
          <Link to="/courses" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
            Show all {activeTab === 'all' ? '' : activeTab} courses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">What We Offer</h2>
            <p className="text-gray-500">Everything you need for your academic success</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{f.label}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Trust Section */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Trusted by Lakhs of Students</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Join millions of students who are already learning from India's best teachers.
              Start your journey today — completely free.
            </p>
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-lg font-medium ml-2">4.8 / 5</span>
              <span className="text-gray-400 ml-1">(based on student reviews)</span>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
            <Link to="/register" className="inline-block mt-8 bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors">
              Start Learning for Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
