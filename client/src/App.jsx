import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';

const PergolaPlannerPage = lazy(() => import('./pages/PergolaPlannerPage'));

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
      טוען עמוד...
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
        </Route>
        <Route path="/pergola" element={<PergolaPlannerPage />} />
      </Routes>
    </Suspense>
  );
}
