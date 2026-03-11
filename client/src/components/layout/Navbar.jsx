import { Link, NavLink } from 'react-router-dom';
import { House, Zap, Hammer } from 'lucide-react';

export default function Navbar() {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur"
      aria-label="ניווט ראשי"
      role="navigation"
    >
      <div className="flex items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3" aria-label="MyVisit – דף הבית">
          <div className="rounded-xl bg-slate-900 p-2 text-white" aria-hidden="true">
            <Zap size={18} />
          </div>
          <span className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">MyVisit</span>
        </Link>

        <div className="flex items-center gap-2" role="list">
          <NavLink
            to="/"
            end
            role="listitem"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
            aria-label="דף הבית"
          >
            <House size={16} aria-hidden="true" />
            בית
          </NavLink>
          <NavLink
            to="/pergola"
            role="listitem"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
            aria-label="מתכנן פרגולות"
          >
            <Hammer size={16} aria-hidden="true" />
            מתכנן פרגולות
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
