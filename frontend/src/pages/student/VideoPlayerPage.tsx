import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PlayCircle, CheckCircle, ChevronRight } from 'lucide-react';
import { coursesApi } from '../../api/courses';
import { studentApi } from '../../api/student';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import type { Course } from '../../types';

export default function VideoPlayerPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const lectureId = searchParams.get('lecture');
  const [course, setCourse] = useState<Course | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (slug) {
      coursesApi.getBySlug(slug).then((res) => {
        setCourse(res.data);
        // Auto-select first lecture if none specified
        if (!lectureId && res.data.chapters && res.data.chapters.length > 0) {
          const firstLecture = res.data.chapters[0]?.lectures[0];
          if (firstLecture) {
            setSearchParams({ lecture: firstLecture.id });
          }
        }
      }).finally(() => setLoading(false));
    }
  }, [slug]);

  useEffect(() => {
    if (lectureId) {
      coursesApi.getLectureStream(lectureId).then((res) => {
        setStreamUrl(res.data.stream_url);
        setCurrentTitle(res.data.title);
      }).catch(() => setStreamUrl(''));
    }
  }, [lectureId]);

  // Track progress every 10 seconds
  useEffect(() => {
    if (!lectureId || !course) return;
    progressInterval.current = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        studentApi.updateProgress({
          lecture_id: lectureId,
          course_id: course.id,
          watched_seconds: Math.floor(video.currentTime),
          is_completed: video.currentTime >= video.duration - 5,
        }).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(progressInterval.current);
  }, [lectureId, course]);

  if (loading) return <LoadingSpinner size="lg" />;
  if (!course) return <p className="text-center py-12">Course not found.</p>;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Video player */}
      <div className="flex-1 bg-black">
        {streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            autoPlay
            className="w-full h-[50vh] lg:h-[70vh]"
          />
        ) : (
          <div className="w-full h-[50vh] lg:h-[70vh] flex items-center justify-center text-white">
            <p>Select a lecture to start watching</p>
          </div>
        )}
        <div className="p-4 bg-white">
          <h2 className="text-xl font-bold">{currentTitle || course.title}</h2>
          <p className="text-sm text-gray-500">{course.instructor_name}</p>
        </div>
      </div>

      {/* Chapter/lecture sidebar */}
      <div className="w-full lg:w-80 bg-white border-l overflow-y-auto max-h-[calc(100vh-4rem)]">
        <div className="p-4 border-b">
          <h3 className="font-bold text-sm">Course Content</h3>
        </div>
        {course.chapters?.map((chapter) => (
          <div key={chapter.id}>
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="font-medium text-sm">{chapter.title}</p>
            </div>
            {chapter.lectures.map((lecture) => (
              <button
                key={lecture.id}
                onClick={() => setSearchParams({ lecture: lecture.id })}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-b hover:bg-gray-50 ${
                  lectureId === lecture.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                }`}
              >
                {lectureId === lecture.id ? (
                  <PlayCircle className="w-4 h-4 text-primary flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
                <span className="truncate">{lecture.title}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
