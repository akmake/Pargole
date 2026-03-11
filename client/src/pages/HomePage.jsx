import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    document.title = 'MyVisit – דף הבית';
  }, []);

  return (
    <main className="welcome-page" dir="rtl" lang="he">
      <div className="hero-shell">
        <div className="hero-copy">
          <h1>דף הבית</h1>
          <p className="hero-text">
            מה הולך היום?
          </p>
        </div>
      </div>
    </main>
  );
}
