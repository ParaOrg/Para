import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ContributePage } from '@/features/contribute';
import { ContributorLocation } from '@/features/locator';
import { createQueryClient } from '@/shared/lib/query-client';

/** The contribute page's shell: the feature's page, with the locator on its map. */
export function ContributeApp() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ContributePage
        locator={(map, isMapLoaded, isRecording, mark) => (
          <ContributorLocation
            map={map}
            isMapLoaded={isMapLoaded}
            isRecording={isRecording}
            above={mark}
          />
        )}
      />
    </QueryClientProvider>
  );
}
