import { lazy, Suspense } from 'react';

import type { StudioReviewProps } from './review-props';
import { STUDIO_DRAFTS } from '../data/flags';

const ReviewWorkspace = lazy(() =>
  import('./review-workspace').then((module) => ({ default: module.ReviewWorkspace })),
);

/** Drafts and review, loaded only when the workflow is on. */
export function StudioReview(props: StudioReviewProps) {
  if (!STUDIO_DRAFTS) return null;
  return (
    <Suspense fallback={null}>
      <ReviewWorkspace {...props} />
    </Suspense>
  );
}
