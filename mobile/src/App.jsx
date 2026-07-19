import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

const HomePage          = lazy(() => import('./pages/HomePage'));
const ProjectPage       = lazy(() => import('./pages/ProjectPage'));
const PergolaPlannerPage = lazy(() => import('./pages/PergolaPlannerPage'));
const NotFoundPage      = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-gray-400" role="status" aria-live="polite">
      טוען...
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                                         element={<HomePage />} />
          <Route path="/project/:projectId"                       element={<ProjectPage />} />
          <Route path="/project/:projectId/pergola/:pergolaId"    element={<PergolaPlannerPage />} />
          <Route path="*"                                         element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
