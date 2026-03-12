import { Outlet } from 'react-router-dom';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { Hammer } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">

      {/* Skip to main content – נגישות מקלדת */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[100] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        דלג לתוכן הראשי
      </a>

      <Navbar />

      <main id="main-content" className="flex-grow pt-16" tabIndex={-1}>
        <Outlet />
      </main>

      <footer
        className="border-t border-gray-100 bg-white"
        role="contentinfo"
        aria-label="פוטר האתר"
      >
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4" dir="rtl">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 text-gray-900 hover:text-emerald-600 transition-colors">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
              <Hammer className="w-3 h-3 text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-extrabold tracking-tight">
              Pergo<span className="text-emerald-600">Calc</span>
            </span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-5 text-sm text-gray-400" aria-label="קישורי footer">
            <Link to="/" className="hover:text-gray-700 transition-colors">בית</Link>
            <Link to="/pergola" className="hover:text-gray-700 transition-colors">מתכנן</Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} PergoCalc. כל הזכויות שמורות.
          </p>

        </div>
      </footer>
    </div>
  );
}
