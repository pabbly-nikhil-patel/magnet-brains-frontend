import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Public pages
import HomePage from './pages/public/HomePage';
import CourseListingPage from './pages/public/CourseListingPage';
import CourseDetailPage from './pages/public/CourseDetailPage';
import SearchPage from './pages/public/SearchPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import CategoryBrowsePage from './pages/public/CategoryBrowsePage';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import MyCoursesPage from './pages/student/MyCoursesPage';
import BookmarksPage from './pages/student/BookmarksPage';
import VideoPlayerPage from './pages/student/VideoPlayerPage';
import PurchaseHistoryPage from './pages/student/PurchaseHistoryPage';
import ProfilePage from './pages/student/ProfilePage';

// Instructor pages
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import ManageCoursesPage from './pages/instructor/ManageCoursesPage';
import CreateCoursePage from './pages/instructor/CreateCoursePage';
import EditCoursePage from './pages/instructor/EditCoursePage';
import EarningsPage from './pages/instructor/EarningsPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminCoursesPage from './pages/admin/AdminCoursesPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminRevenuePage from './pages/admin/AdminRevenuePage';
import AdminPayoutsPage from './pages/admin/AdminPayoutsPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CourseListingPage />} />
            <Route path="/courses/search" element={<SearchPage />} />
            <Route path="/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Category Browsing: Board > Class > Stream > Subject */}
            <Route path="/browse" element={<CategoryBrowsePage />} />
            <Route path="/browse/:boardSlug" element={<CategoryBrowsePage />} />
            <Route path="/browse/:boardSlug/:classSlug" element={<CategoryBrowsePage />} />
            <Route path="/browse/:boardSlug/:classSlug/:streamSlug" element={<CategoryBrowsePage />} />
            <Route path="/browse/:boardSlug/:classSlug/:streamSlug/:subjectSlug" element={<CategoryBrowsePage />} />

            {/* Student */}
            <Route path="/dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
            <Route path="/my-courses" element={<ProtectedRoute roles={['student']}><MyCoursesPage /></ProtectedRoute>} />
            <Route path="/bookmarks" element={<ProtectedRoute roles={['student']}><BookmarksPage /></ProtectedRoute>} />
            <Route path="/watch/:slug" element={<ProtectedRoute><VideoPlayerPage /></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute roles={['student']}><PurchaseHistoryPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

            {/* Instructor */}
            <Route path="/instructor" element={<ProtectedRoute roles={['instructor']}><InstructorDashboard /></ProtectedRoute>} />
            <Route path="/instructor/courses" element={<ProtectedRoute roles={['instructor']}><ManageCoursesPage /></ProtectedRoute>} />
            <Route path="/instructor/courses/new" element={<ProtectedRoute roles={['instructor']}><CreateCoursePage /></ProtectedRoute>} />
            <Route path="/instructor/courses/:id/edit" element={<ProtectedRoute roles={['instructor']}><EditCoursePage /></ProtectedRoute>} />
            <Route path="/instructor/earnings" element={<ProtectedRoute roles={['instructor']}><EarningsPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/users/:id" element={<ProtectedRoute roles={['admin']}><AdminUserDetailPage /></ProtectedRoute>} />
            <Route path="/admin/courses" element={<ProtectedRoute roles={['admin']}><AdminCoursesPage /></ProtectedRoute>} />
            <Route path="/admin/categories" element={<ProtectedRoute roles={['admin']}><AdminCategoriesPage /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute roles={['admin']}><AdminRevenuePage /></ProtectedRoute>} />
            <Route path="/admin/payouts" element={<ProtectedRoute roles={['admin']}><AdminPayoutsPage /></ProtectedRoute>} />
            <Route path="/admin/analytics" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
