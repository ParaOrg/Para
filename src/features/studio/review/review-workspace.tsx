import type { StudioReviewProps } from './review-props';
import { ReviewWorkspaceContent } from './review-workspace-content';

/** Drafts, loaded on its own: its cache is the studio's (StudioSessionProvider). */
export function ReviewWorkspace(props: StudioReviewProps) {
  return <ReviewWorkspaceContent {...props} />;
}
