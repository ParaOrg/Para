import { useState } from 'react';

import { installApp, useInstallOffer } from './install-offer';

/**
 * The install prompt, on an Android phone that has not installed Para Po,
 * once `isReady` (the routes on the map); "later" hides it until the next
 * visit.
 */
export function useInstallPrompt(isReady: boolean) {
  const canInstall = useInstallOffer();
  const [isPostponed, setIsPostponed] = useState(false);
  return {
    shouldShow: canInstall && !isPostponed && isReady,
    install: () => void installApp(),
    postpone: () => setIsPostponed(true),
  };
}
