import { useEffect, useState } from 'react';

import { searchWithMap, studioMapFromSearch, type StudioMapName } from './studio-map';

interface StudioMapState {
  studioMap: StudioMapName;
  chooseStudioMap: (next: StudioMapName) => void;
}

/**
 * Which of the three maps is shown, kept in the address as `?map=` so a
 * reload, a bookmark and the Back button return to it. Choosing a map adds a
 * history entry and changes nothing else on the page.
 */
export function useStudioMap(): StudioMapState {
  const [studioMap, setStudioMap] = useState(() => studioMapFromSearch(window.location.search));

  useEffect(() => {
    const handlePopState = () => setStudioMap(studioMapFromSearch(window.location.search));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const chooseStudioMap = (next: StudioMapName) => {
    if (next === studioMap) return;
    const url = new URL(window.location.href);
    url.search = searchWithMap(url.search, next);
    window.history.pushState(null, '', url);
    setStudioMap(next);
  };

  return { studioMap, chooseStudioMap };
}
