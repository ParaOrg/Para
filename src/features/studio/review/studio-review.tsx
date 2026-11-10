import { lazy, Suspense } from 'react';

import type { StudioReviewProps } from './review-props';

const ReviewWorkspace = lazy(() =>
  import('./review-workspace').then((module) => ({ default: module.ReviewWorkspace })),
);

/** Drafts and review, loaded apart from the editor's first screen. */
export function StudioReview(props: StudioReviewProps) {
  return (
    <Suspense fallback={null}>
      <ReviewWorkspace {...props} />
    </Suspense>
  );
}
