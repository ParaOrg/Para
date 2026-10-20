import { lazy, Suspense } from 'react';

import type { StudioContributorsProps } from './contributors-props';

const ContributorsWorkspace = lazy(() =>
  import('./contributors-workspace').then((module) => ({ default: module.ContributorsWorkspace })),
);

/** The Contributors map, loaded only when it is opened. */
export function StudioContributors(props: StudioContributorsProps) {
  return (
    <Suspense fallback={null}>
      <ContributorsWorkspace {...props} />
    </Suspense>
  );
}
