import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import {
  LayoutDashboard, BookOpen, Bookmark, ShoppingCart, User,
  PlusCircle, DollarSign, Users, BarChart3, Settings, Layers, CreditCard
} from 'lucide-react';

interface SidebarLink {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { user } = useAuthStore();
  const location = useLocation();

  const studentLinks: SidebarLink[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'My Courses', path: '/my-courses', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Bookmarks', path: '/bookmarks', icon: <Bookmark className="w-5 h-5" /> },
    { label: 'Purchases', path: '/purchases', icon: <ShoppingCart className="w-5 h-5" /> },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  const instructorLinks: SidebarLink[] = [
    { label: 'Dashboard', path: '/instructor', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'My Courses', path: '/instructor/courses', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Create Course', path: '/instructor/courses/new', icon: <PlusCircle className="w-5 h-5" /> },
    { label: 'Earnings', path: '/instructor/earnings', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Profile', path: '/profile', icon: <User className="w-5 h-5" /> },
  ];

  const adminLinks: SidebarLink[] = [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Courses', path: '/admin/courses', icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Categories', path: '/admin/categories', icon: <Layers className="w-5 h-5" /> },
    { label: 'Revenue', path: '/admin/revenue', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'Payouts', path: '/admin/payouts', icon: <CreditCard className="w-5 h-5" /> },
    { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const links = user?.role === 'admin'
    ? adminLinks
    : user?.role === 'instructor'
    ? instructorLinks
    : studentLinks;

  return (
    <aside className="w-64 bg-white border-r min-h-[calc(100vh-4rem)] p-4">
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              location.pathname === link.path
                ? 'bg-primary/10 text-primary'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
