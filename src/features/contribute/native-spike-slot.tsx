import { lazy, Suspense } from 'react';

import { isNativeApp } from './native-app';

const NativeSpikePanel = lazy(() =>
  import('./native-spike-panel').then((module) => ({ default: module.NativeSpikePanel })),
);

/** The spike's panel, in the Android app only; the web page never loads it. */
export function NativeSpikeSlot() {
  if (!isNativeApp()) return null;
  return (
    <Suspense fallback={null}>
      <NativeSpikePanel />
    </Suspense>
  );
}
