import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ContributePage, PageErrorScreen } from '@/features/contribute';
import { ContributorLocation } from '@/features/locator';
import { createQueryClient } from '@/shared/lib/query-client';
import { ErrorBoundary } from '@/shared/ui/error-boundary';

/**
 * The contribute page's shell: the feature's page, with the locator on its map, inside the page's
 * error boundary, so a screen that fails shows what happened instead of a blank page.
 */
export function ContributeApp() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallback={<PageErrorScreen />}>
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
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
