import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, LayoutDashboard, BookOpen, Bell } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useCourseStore } from '../../stores/courseStore';
import { authApi } from '../../api/auth';
import { coursesApi } from '../../api/courses';
import type { CourseListItem } from '../../types';

export default function Navbar() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { searchQuery, setSearchQuery } = useCourseStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CourseListItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close dropdown on any route change
  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
    setShowSuggestions(false);
  }, [location.pathname]);

  // Debounced search suggestions
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await coursesApi.search(query, 1);
        setSuggestions(res.data.data.slice(0, 6));
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate('/');
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'instructor') return '/instructor';
    return '/dashboard';
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/brand/MB-Logo-Dark.png" alt="Magnet Brains" className="h-10" />
          </Link>

          {/* Search */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8 relative" ref={searchRef}>
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder="Search courses, subjects, instructors..."
                  className="input-field pl-10 pr-4 py-2"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>
            </form>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
                {/* Search query suggestion */}
                {searchQuery.trim() && (
                  <Link
                    to={`/courses/search?q=${encodeURIComponent(searchQuery)}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 border-b"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">{searchQuery}</span>
                  </Link>
                )}

                {searchLoading ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">Searching...</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                      onClick={() => setShowSuggestions(false)}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {course.thumbnail_url ? (
                          <img src={course.thumbnail_url} className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{course.title}</p>
                        <p className="text-xs text-gray-500">
                          Course &middot; {course.instructor_name}
                        </p>
                      </div>
                    </Link>
                  ))
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="px-4 py-6 text-center text-sm text-gray-400">No results found</div>
                ) : null}
              </div>
            )}
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {!isAuthenticated && (
              <Link to="/courses" className="text-gray-600 hover:text-dark font-medium">
                Courses
              </Link>
            )}

            {isAuthenticated ? (
              <>
              {/* Notification bell */}
              <button className="relative text-gray-500 hover:text-dark p-1">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 text-gray-600 hover:text-dark"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="font-medium text-sm">{user?.full_name}</p>
                      <p className="text-xs text-gray-500">{user?.role}</p>
                    </div>
                    <Link
                      to={getDashboardPath()}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User className="w-4 h-4" /> Profile
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"
                    >
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline text-sm">Log In</Link>
                <Link to="/register" className="btn-primary text-sm">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <form onSubmit={handleSearch} className="mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses..."
                className="input-field"
              />
            </form>
            <Link to="/courses" className="block py-2 text-gray-600" onClick={() => setMobileOpen(false)}>Courses</Link>
            {isAuthenticated ? (
              <>
                <Link to={getDashboardPath()} className="block py-2" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <button onClick={handleLogout} className="block py-2 text-red-600">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2" onClick={() => setMobileOpen(false)}>Log In</Link>
                <Link to="/register" className="block py-2 text-primary font-medium" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
