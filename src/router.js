// Minimal hash router: works on any static host (GitHub Pages, Netlify, artifact pages)
// without server rewrites. Routes mirror the original Rails routes.
import { useEffect, useState } from 'react';

const read = () => (window.location.hash.replace(/^#\/?/, '') || 'home').split('?')[0];

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
