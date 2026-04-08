import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, PlayCircle, Award, Users, MessageCircle, Video,
  ChevronRight, ChevronLeft, GraduationCap, FileText, Star,
  Briefcase, Code, TrendingUp, Shield, Landmark, Train, PenTool
} from 'lucide-react';
import { coursesApi } from '../../api/courses';
import { useCourseStore } from '../../stores/courseStore';
import CourseCard from '../../components/shared/CourseCard';
import type { CourseListItem, Category } from '../../types';

// Domain icons mapping
const domainIcons: Record<string, React.ReactNode> = {
  'academic': <GraduationCap className="w-6 h-6" />,
  'govt-exams': <Landmark className="w-6 h-6" />,
  'competitive-exams': <Award className="w-6 h-6" />,
  'skill-development': <Code className="w-6 h-6" />,
};

const topicIcons: Record<string, React.ReactNode> = {
  'banking-insurance': <Briefcase className="w-5 h-5" />,
  'railways': <Train className="w-5 h-5" />,
  'ssc': <Shield className="w-5 h-5" />,
  'upsc': <Landmark className="w-5 h-5" />,
  'state-psc': <Landmark className="w-5 h-5" />,
  'defence': <Shield className="w-5 h-5" />,
  'teaching-exams': <PenTool className="w-5 h-5" />,
  'jee': <TrendingUp className="w-5 h-5" />,
  'neet': <TrendingUp className="w-5 h-5" />,
  'cuet': <BookOpen className="w-5 h-5" />,
  'ca-foundation': <Briefcase className="w-5 h-5" />,
  'computer-science': <Code className="w-5 h-5" />,
  'digital-marketing': <TrendingUp className="w-5 h-5" />,
  'english-speaking': <MessageCircle className="w-5 h-5" />,
  'tally-accounting': <Briefcase className="w-5 h-5" />,
};

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

  const domains = categories.filter((c) => c.type === 'domain');
  const boards = categories.filter((c) => c.type === 'board');

  const getChildren = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

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
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -320 : 320,
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
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Learn Smarter with<br />
                <span className="text-primary">Free Online Education</span>
              </h1>
              <p className="text-gray-300 text-lg mb-6 max-w-lg">
                From board exams to government jobs to skill development — learn from India's best teachers, absolutely free.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
                {[
                  { icon: <GraduationCap className="w-5 h-5" />, text: 'CBSE, MP, UP & Bihar Board' },
                  { icon: <Landmark className="w-5 h-5" />, text: 'SSC, Banking, Railways' },
                  { icon: <Award className="w-5 h-5" />, text: 'JEE, NEET, CUET Prep' },
                  { icon: <Code className="w-5 h-5" />, text: 'Coding & Digital Skills' },
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

      {/* Domain Categories - Professional Grid */}
      {domains.length > 0 && (
        <section className="bg-white border-b py-10">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">What do you want to learn?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {domains.map((domain) => {
                const children = getChildren(domain.id);
                return (
                  <div key={domain.id} className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center">
                        {domainIcons[domain.slug] || <BookOpen className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-bold">{domain.name}</h3>
                        {domain.description && (
                          <p className="text-xs text-gray-500">{domain.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      {children.slice(0, 5).map((child) => (
                        <Link
                          key={child.id}
                          to={`/browse/${domain.slug}/${child.slug}`}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors py-0.5"
                        >
                          {topicIcons[child.slug] || <ChevronRight className="w-4 h-4" />}
                          <span>{child.name}</span>
                        </Link>
                      ))}
                      {children.length > 5 && (
                        <p className="text-xs text-gray-400 pl-7">+{children.length - 5} more</p>
                      )}
                    </div>
                    <Link
                      to={`/browse/${domain.slug}`}
                      className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                    >
                      Explore all <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Academic Boards - Quick Access */}
      {boards.length > 0 && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-xl font-bold mb-4">Academic Boards</h2>
            <div className="flex flex-wrap gap-3">
              {boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/browse/academic/${board.slug}`}
                  className="px-5 py-2.5 bg-white rounded-lg border hover:border-primary hover:text-primary hover:bg-primary/5 transition-all text-sm font-medium shadow-sm"
                >
                  {board.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tabbed Course Section */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">Popular Courses</h2>
          <p className="text-gray-500">Handpicked courses across all categories</p>
        </div>
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
        {loading ? (
          <p className="text-center text-gray-500 py-12">Loading courses...</p>
        ) : (
          <div className="relative group">
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
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-1 px-1"
            >
              {filteredCourses.map((course) => (
                <div key={course.id} className="flex-shrink-0 w-72">
                  <CourseCard course={course} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6">
          <Link to="/courses" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
            Show all courses <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Government Exams Highlight */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Government Exam Preparation</h2>
              <p className="text-blue-200 mb-4">Complete preparation for Banking, SSC, Railways, UPSC and more</p>
              <div className="flex flex-wrap gap-3">
                {['Banking & Insurance', 'SSC', 'Railways', 'UPSC', 'Defence'].map((exam) => (
                  <span key={exam} className="bg-white/10 px-4 py-1.5 rounded-full text-sm">{exam}</span>
                ))}
              </div>
            </div>
            <Link to="/browse/govt-exams" className="bg-white text-blue-900 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap">
              Explore Govt Exams
            </Link>
          </div>
        </div>
      </section>

      {/* Become an Instructor CTA */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-r from-primary/10 to-lime-50 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Become an Instructor</h2>
              <p className="text-gray-600 max-w-xl">
                Share your knowledge with lakhs of students. Create courses, upload videos, and earn money.
                Join our growing community of 50+ expert teachers.
              </p>
            </div>
            <Link to="/register" className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors whitespace-nowrap">
              Start Teaching Today
            </Link>
          </div>
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

      {/* Student Testimonials */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-2">See what others are achieving through learning</h2>
          <p className="text-gray-500 mb-8">Real stories from our students</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { quote: 'The physics lectures are incredibly clear. I scored 95% in my board exams thanks to the detailed explanations.', name: 'Ananya M', initials: 'AM', course: 'Class 12 Physics', slug: 'complete-physics-class-12' },
              { quote: 'Best free education platform! The chemistry course covers every NCERT topic. Helped me crack my entrance exam.', name: 'Rohit K', initials: 'RK', course: 'Class 12 Chemistry', slug: 'chemistry-full-course-class-12' },
              { quote: 'The step-by-step approach in mathematics made everything click. Calculus finally makes sense!', name: 'Priya S', initials: 'PS', course: 'Class 12 Mathematics', slug: 'mathematics-premium-class-12' },
              { quote: 'Biology lectures with diagrams and NCERT alignment are perfect for NEET preparation. Scored 650+!', name: 'Vikash T', initials: 'VT', course: 'Class 12 Biology', slug: 'biology-complete-class-12' },
            ].map((t, i) => (
              <div key={i} className="card p-6 flex flex-col justify-between">
                <div>
                  <span className="text-4xl text-black-200 leading-none">&ldquo;</span>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">{t.quote}</p>
                </div>
                <div className="mt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-bold">{t.initials}</div>
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  <Link to={`/courses/${t.slug}`} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                    {t.course} course <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Trusted by Lakhs of Students</h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
              Join millions of students who are already learning from India's best teachers.
            </p>
            <div className="flex items-center justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-lg font-medium ml-2">4.8 / 5</span>
              <span className="text-gray-400 ml-1">(based on student reviews)</span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              {stats.map((stat, i) => (
                <div key={i}>
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
            <Link to="/register" className="inline-block bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors">
              Start Learning for Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
