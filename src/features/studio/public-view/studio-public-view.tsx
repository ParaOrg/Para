import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { createQueryClient } from '@/shared/lib/query-client';

import { PublicViewContent } from './public-view-content';
import { STUDIO_DRAFTS } from '../data/flags';
import { MapPlaceholder } from '../maps/map-placeholder';

/** The actual published map, in its own read-only page and data context. */
export function StudioPublicView({
  hasLine,
  onOpenPlayground,
}: {
  hasLine: boolean;
  onOpenPlayground: () => void;
}) {
  const [client] = useState(createQueryClient);
  useEffect(() => () => client.clear(), [client]);
  if (!STUDIO_DRAFTS)
    return <MapPlaceholder map="public" hasLine={hasLine} onOpenPlayground={onOpenPlayground} />;
  return (
    <QueryClientProvider client={client}>
      <PublicViewContent />
    </QueryClientProvider>
  );
}
