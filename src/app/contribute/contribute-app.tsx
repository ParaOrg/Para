import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { ContributePage } from '@/features/contribute';
import { ContributorLocation } from '@/features/locator';
import { createQueryClient } from '@/shared/lib/query-client';
import { ErrorBoundary } from '@/shared/ui/error-boundary';
import { PageErrorScreen } from '@/shared/ui/page-error-screen';

/**
 * The recorder lives inside the page, so it stops with it: the points kept so far stay on the
 * phone, and nothing new is recorded until Try again reloads and the ride, back as left open, is
 * resumed. A stand-in until the owner writes it.
 */
const PAGE_ERROR_DESCRIPTION =
  'Recording is paused. What you’ve recorded so far is safe on this phone. Check your signal, then tap Try again to continue.';

/**
 * The contribute page's shell: the feature's page, with the locator on its map, inside the page's
 * error boundary, so a screen that fails shows what happened instead of a blank page.
 */
export function ContributeApp() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary fallback={<PageErrorScreen description={PAGE_ERROR_DESCRIPTION} />}>
        <ContributePage
          locator={(map, isMapLoaded, isRecording, mark, onNote, onWhere, isDocked) => (
            <ContributorLocation
              map={map}
              isMapLoaded={isMapLoaded}
              isRecording={isRecording}
              isDocked={isDocked}
              above={mark}
              onNote={onNote}
              onWhere={onWhere}
            />
          )}
        />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
