import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createQueryClient } from '@/shared/lib/query-client';

import type { StudioContributorsProps } from './contributors-props';
import { ContributorsView } from './contributors-view';

/** Mounted with the signed-in user's key, so one account's uploads are never cached for another. */
export function ContributorsWorkspace(props: StudioContributorsProps) {
  const [client] = useState(createQueryClient);
  useEffect(() => () => client.clear(), [client]);
  return (
    <QueryClientProvider client={client}>
      <ContributorsView {...props} />
    </QueryClientProvider>
  );
}
