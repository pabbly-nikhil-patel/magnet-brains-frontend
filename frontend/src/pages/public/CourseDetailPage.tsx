import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BookOpen, Clock, Users, PlayCircle, Lock, ChevronDown, ChevronUp, CheckCircle, Video, FileText, Award, Download, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { coursesApi } from '../../api/courses';
import { studentApi, paymentsApi } from '../../api/student';
import { useAuthStore } from '../../stores/authStore';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Course } from '../../types';

declare global {
  interface Window { Razorpay: any; }
}

export default function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (slug) {
      coursesApi.getBySlug(slug).then((res) => setCourse(res.data)).finally(() => setLoading(false));
    }
  }, [slug]);

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setEnrolling(true);
    try {
      await studentApi.enroll(course!.id);
      toast.success('Enrolled successfully!');
      navigate(`/watch/${course!.slug}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleBuy = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    try {
      const { data } = await paymentsApi.createOrder(course!.id);
      const options = {
        key: data.razorpay_key,
        amount: data.amount,
        currency: data.currency,
        name: 'Magnet Brains',
        description: data.course_title,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            await paymentsApi.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              course_id: course!.id,
            });
            toast.success('Payment successful!');
            navigate(`/watch/${course!.slug}`);
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { email: user?.email, name: user?.full_name },
        theme: { color: '#f97316' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create order');
    }
  };

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const formatDurationLong = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (!course) return <p className="text-center py-12 text-gray-500">Course not found.</p>;

  const discountedPrice = course.discount_pct
    ? (course.price || 0) * (1 - course.discount_pct / 100)
    : course.price;

  const totalLectures = course.chapters?.reduce((sum, ch) => sum + ch.lectures.length, 0) || course.total_lectures;

  return (
    <div>
      {/* Dark Hero Header */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Course Info */}
            <div className="flex-1">
              <nav className="text-sm text-gray-400 mb-4 flex items-center gap-1 flex-wrap">
                <Link to="/" className="hover:text-white">Home</Link>
                {course.board_name && <><span>/</span><Link to="/browse" className="hover:text-white">{course.board_name}</Link></>}
                {course.class_name && <><span>/</span><span>{course.class_name}</span></>}
                {course.stream_name && <><span>/</span><span>{course.stream_name}</span></>}
                {course.subject_name && <><span>/</span><span>{course.subject_name}</span></>}
              </nav>

              <h1 className="text-3xl md:text-4xl font-bold mb-3">{course.title}</h1>
              <p className="text-gray-300 text-sm mb-4">{course.instructor_name}</p>

              {course.syllabus_points && course.syllabus_points.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold mb-2">This Course Covers The Following:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                    {course.syllabus_points.map((point, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-200">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-400 mt-4">
                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {totalLectures} Lectures</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDurationLong(course.total_duration)}</span>
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.total_enrollments} Students</span>
                <span className="capitalize">{course.language}</span>
              </div>
            </div>

            {/* Course Thumbnail Card */}
            <div className="w-full lg:w-96 flex-shrink-0">
              <div className="bg-gray-700 rounded-xl overflow-hidden shadow-2xl">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-gray-600 to-gray-800">
                    <div className="text-center px-6">
                      <BookOpen className="w-16 h-16 text-primary mx-auto mb-2" />
                      <p className="text-white font-bold text-lg">{course.title}</p>
                    </div>
                  </div>
                )}
                {course.is_full_course && (
                  <div className="bg-gray-800 px-4 py-2">
                    <span className="bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded">FULL COURSE</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Chapters */}
          <div className="flex-1">
            {course.description && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">About this Course</h2>
                <p className="text-gray-700 whitespace-pre-line">{course.description}</p>
              </div>
            )}

            <h2 className="text-2xl font-bold mb-1">Watch all Videos</h2>
            <p className="text-sm text-gray-500 mb-4">
              {course.total_chapters} Chapters &bull; {totalLectures} Lectures &bull; {formatDurationLong(course.total_duration)} Total
            </p>

            <div className="space-y-2">
              {course.chapters?.map((chapter) => {
                const isExpanded = expandedChapters.has(chapter.id);
                const showAll = expandedChapters.has(chapter.id + '_all');
                const visibleLimit = 5;

                return (
                  <div key={chapter.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleChapter(chapter.id)}
                      className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                        isExpanded ? 'bg-orange-50 border-b' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded
                          ? <ChevronUp className="w-5 h-5 text-primary" />
                          : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        <span className="font-semibold">{chapter.title}</span>
                      </div>
                      <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                        {chapter.lectures.length} Lectures
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="bg-white divide-y">
                        {chapter.lectures.map((lecture, idx) => {
                          if (!showAll && idx >= visibleLimit) {
                            if (idx === visibleLimit) {
                              return (
                                <button
                                  key="show-more"
                                  onClick={() => setExpandedChapters(prev => new Set([...prev, chapter.id + '_all']))}
                                  className="w-full py-3 text-center text-sm text-primary font-medium bg-orange-50 hover:bg-orange-100 transition-colors"
                                >
                                  {chapter.lectures.length - visibleLimit} More Lessons
                                </button>
                              );
                            }
                            return null;
                          }

                          return (
                            <div key={lecture.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                              <div className="flex items-center gap-3">
                                <PlayCircle className={`w-4 h-4 ${lecture.is_preview ? 'text-primary' : 'text-gray-400'}`} />
                                <span className={`text-sm ${lecture.is_preview ? 'text-primary font-medium' : 'text-gray-700'}`}>
                                  {lecture.title}
                                </span>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                {lecture.is_preview ? (
                                  <span className="text-sm text-primary font-medium">Watch Now!</span>
                                ) : (
                                  <Lock className="w-4 h-4 text-gray-300 inline" />
                                )}
                                {lecture.duration != null && (
                                  <p className="text-xs text-gray-400">{formatDuration(lecture.duration)} Duration</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {course.tags && course.tags.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="card p-6 sticky top-20">
              {/* Price */}
              <div className="text-center mb-4">
                {course.is_free ? (
                  <p className="text-2xl font-bold text-green-600">Free Course</p>
                ) : (
                  <>
                    <p className="text-3xl font-bold">₹{discountedPrice?.toFixed(0)}</p>
                    {course.discount_pct ? (
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-gray-400 line-through">₹{course.price}</span>
                        <span className="badge-green">{course.discount_pct}% off</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {course.is_free ? (
                <button onClick={handleEnroll} disabled={enrolling} className="btn-primary w-full text-lg py-3 mb-4">
                  {enrolling ? 'Enrolling...' : 'Start Learning Free'}
                </button>
              ) : (
                <button onClick={handleBuy} className="btn-primary w-full text-lg py-3 mb-4">
                  Buy Course
                </button>
              )}

              {/* What We Offer */}
              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">What We Offer:</h3>
                <ul className="space-y-2.5">
                  {[
                    { icon: <Award className="w-4 h-4" />, text: '100% Quality Education' },
                    { icon: <Users className="w-4 h-4" />, text: "India's Top Teachers" },
                    { icon: <Video className="w-4 h-4" />, text: 'Live & Recorded Lectures' },
                    { icon: <FileText className="w-4 h-4" />, text: 'Sample Papers & E-Books' },
                    { icon: <FileText className="w-4 h-4" />, text: 'Previous Year Question Paper' },
                    { icon: <Download className="w-4 h-4" />, text: 'Detailed E-Notes' },
                    { icon: <PlayCircle className="w-4 h-4" />, text: 'Exam Preparation Videos' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className="text-red-500">{item.icon}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              </div>

              <button className="w-full border-2 border-primary text-primary rounded-lg py-2.5 mt-4 font-semibold hover:bg-primary hover:text-white transition-colors">
                Grab E-Notes
              </button>

              <div className="border-t pt-4 mt-4 text-center">
                <p className="text-sm text-gray-500 mb-2">Get Free Mobile App Now</p>
                <Smartphone className="w-8 h-8 text-gray-400 mx-auto" />
              </div>

              {course.instructor_name && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-bold mb-3">Instructor</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {course.instructor_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{course.instructor_name}</p>
                      {course.instructor_bio && <p className="text-xs text-gray-500 line-clamp-2">{course.instructor_bio}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
