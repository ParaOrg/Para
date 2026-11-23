import { Suspense } from 'react';

import { retryingLazy } from '@/shared/lib/retrying-lazy';
import { retryingImport } from '@/shared/utils/retrying-import';

import type { StudioContributorsProps } from './contributors-props';

// A fetch that fails draws nothing, never the page's error screen, and is asked for again.
const ContributorsWorkspace = retryingLazy(() =>
  retryingImport(() => import('./contributors-workspace'))().then(
    (module) => module.ContributorsWorkspace,
  ),
);

/** The Contributors map, loaded only when it is opened. */
export function StudioContributors(props: StudioContributorsProps) {
  return (
    <Suspense fallback={null}>
      <ContributorsWorkspace {...props} />
    </Suspense>
  );
}
