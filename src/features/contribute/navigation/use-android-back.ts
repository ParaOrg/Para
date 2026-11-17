import { useEffect } from 'react';

import { closeTopLayer } from '@/shared/hooks/use-back-layer';

import { leaveApp, listenForBack } from '../native-bridge/back-button';

declare global {
  interface Window {
    /** Development builds with `?e2e`: Back, as Android sends it. */
    __paraBack?: () => void;
    /** Development builds with `?e2e`: how many times Back left the app. */
    __paraLeaves?: number;
  }
}

/** Back: the top layer closes; with none open (Record, the start gate, onboarding) the app is left. */
function handleBack(): void {
  if (!closeTopLayer()) leaveApp();
}

/**
 * Android's Back, for the contributor page. In a development build `?e2e` also hands the handler to
 * the headless checks as `window.__paraBack`, counting each leave as `window.__paraLeaves`;
 * production builds drop it (check-build proves no built file names `e2e`).
 */
export function useAndroidBack(): void {
  useEffect(() => listenForBack(handleBack), []);
  useEffect(() => {
    // The constant `false` in a production build: the whole branch, `e2e` with it, is dropped.
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('e2e')) {
      window.__paraLeaves = 0;
      window.__paraBack = () => {
        if (!closeTopLayer()) window.__paraLeaves = (window.__paraLeaves ?? 0) + 1;
      };
      return () => {
        delete window.__paraBack;
      };
    }
  }, []);
}
