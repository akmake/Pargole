import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center"
          dir="rtl"
          lang="he"
          role="alert"
        >
          <p className="text-6xl" aria-hidden="true">⚠️</p>
          <h1 className="text-2xl font-bold text-slate-800">אירעה שגיאה בלתי צפויה</h1>
          <p className="max-w-sm text-slate-500">
            משהו השתבש. אנא נסה לרענן את הדף או חזור לדף הבית.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              רענן דף
            </button>
            <Link
              to="/"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              דף הבית
            </Link>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
