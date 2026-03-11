import { useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  useEffect(() => {
    document.title = '404 – עמוד לא נמצא | MyVisit';
  }, []);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center"
      dir="rtl"
      lang="he"
    >
      <p className="text-8xl font-black text-slate-200" aria-hidden="true">404</p>
      <h1 className="text-2xl font-bold text-slate-800">העמוד לא נמצא</h1>
      <p className="max-w-sm text-slate-500">
        נראה שהדף שחיפשת לא קיים או שהכתובת שגויה.
      </p>
      <Link
        to="/"
        className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
      >
        חזרה לדף הבית
      </Link>
    </main>
  );
}
