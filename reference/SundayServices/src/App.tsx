import React, { useEffect, useState } from 'react';
import AdminApp from './AdminApp';
import { CongregationView } from './components/CongregationView';
import { LandingPage } from './components/LandingPage';

type Route = 'landing' | 'admin' | 'congregation';

function resolveRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('congregation')) return 'congregation';
  if (hash.startsWith('admin')) return 'admin';
  return 'landing';
}

export default function App() {
  const [route, setRoute] = useState<Route>(resolveRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(resolveRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === 'congregation') return <CongregationView />;

  if (route === 'landing') {
    return (
      <LandingPage
        onStart={({ churchName }) => {
          try {
            localStorage.setItem('churchName', churchName);
          } catch {
            // localStorage may be unavailable (e.g. private browsing); church
            // name is a display convenience, so just skip persisting it.
          }
          window.location.hash = '#/admin';
        }}
      />
    );
  }

  return <AdminApp />;
}
