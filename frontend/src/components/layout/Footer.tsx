import { Link } from 'react-router-dom';


export default function Footer() {
  return (
    <footer className="bg-dark text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <img src="/brand/MB-Logo-Light.webp" alt="Magnet Brains" className="h-10" />
            </div>
            <p className="text-sm text-gray-400">
              India's leading free online education platform. High-quality video lectures for all classes and boards.
            </p>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-white mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact</Link></li>
              <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Study Material */}
          <div>
            <h3 className="font-bold text-white mb-4">Study Material</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses?board=cbse-english" className="hover:text-white">CBSE English Medium</Link></li>
              <li><Link to="/courses?board=cbse-hindi" className="hover:text-white">CBSE Hindi Medium</Link></li>
              <li><Link to="/courses?board=mp-board" className="hover:text-white">MP Board</Link></li>
              <li><Link to="/courses?board=up-board" className="hover:text-white">UP Board</Link></li>
            </ul>
          </div>

          {/* Top Courses */}
          <div>
            <h3 className="font-bold text-white mb-4">Our Top Courses</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses?class=cbse-en-class-12&stream=cbse-en-12-science" className="hover:text-white">Class 12 Science</Link></li>
              <li><Link to="/courses?class=cbse-en-class-12&stream=cbse-en-12-commerce" className="hover:text-white">Class 12 Commerce</Link></li>
              <li><Link to="/courses?class=cbse-en-class-10" className="hover:text-white">Class 10 All Subjects</Link></li>
              <li><Link to="/courses?class=cbse-en-class-9" className="hover:text-white">Class 9 All Subjects</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Magnet Brains. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
