import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Skip to main content – נגישות מקלדת */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[100] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        דלג לתוכן הראשי
      </a>

      <Navbar />

      <main id="main-content" className="flex-grow pt-20" tabIndex={-1}>
        <Outlet />
      </main>

      <footer
        className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500"
        role="contentinfo"
        aria-label="פוטר האתר"
      >
        <p>© {new Date().getFullYear()} MyVisit. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
