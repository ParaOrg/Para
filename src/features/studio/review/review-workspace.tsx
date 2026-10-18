import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createQueryClient } from '@/shared/lib/query-client';

import type { StudioReviewProps } from './review-props';
import { ReviewWorkspaceContent } from './review-workspace-content';

/** Mounted with the signed-in user's key so private cached drafts never cross accounts. */
export function ReviewWorkspace(props: StudioReviewProps) {
  const [client] = useState(createQueryClient);
  useEffect(() => () => client.clear(), [client]);
  return (
    <QueryClientProvider client={client}>
      <ReviewWorkspaceContent {...props} />
    </QueryClientProvider>
  );
}
