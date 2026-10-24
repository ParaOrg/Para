import { lazy, Suspense } from 'react';

import { isNativeApp } from './native-app';

const NativeSpikePanel = lazy(() =>
  import('./native-spike-panel').then((module) => ({ default: module.NativeSpikePanel })),
);

/**
 * The spike's panel and a banner that says this is the test build. Shown whenever this is the
 * app's build (`--mode apk`), not only when Capacitor is detected, so a missed detection still
 * shows it. The web page never loads it.
 */
export function NativeSpikeSlot() {
  if (import.meta.env.MODE !== 'apk' && !isNativeApp()) return null;
  return (
    <Suspense fallback={null}>
      <NativeSpikePanel />
    </Suspense>
  );
}
