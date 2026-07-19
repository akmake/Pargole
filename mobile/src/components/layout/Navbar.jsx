import { Link, NavLink } from 'react-router-dom';
import { Hammer } from 'lucide-react';

export default function Navbar() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 bg-white border-b border-gray-100"
      aria-label="ניווט ראשי"
      role="navigation"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-5 h-16">

        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          aria-label="PergoCalc – דף הבית"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
            <Hammer className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-[17px] font-extrabold tracking-tight text-gray-900">
            Pergo<span className="text-emerald-600">Calc</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1" role="list">
          <NavLink
            to="/"
            end
            role="listitem"
            aria-label="דף הבית"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            בית
          </NavLink>

          <NavLink
            to="/pergola"
            role="listitem"
            aria-label="מתכנן פרגולות"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                isActive ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            מתכנן
          </NavLink>

          <Link
            to="/pergola"
            className="mr-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            התחל לתכנן
          </Link>
        </div>

      </div>
    </nav>
  );
}
