import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { accountKeys } from './account-keys';
import { readPendingClaim } from './claim-token';
import { finishPendingClaim } from './earlier-identity';
import { requireClient } from './require-client';

/**
 * Finishes a claim the sign-in could not, whenever the phone comes back online or to the front,
 * so the token's 10 minutes are not spent waiting for the next start.
 */
export function useClaimRetry(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const retry = () => {
      // Nothing is loaded or asked while there is no claim.
      if (!readPendingClaim()) return;
      requireClient()
        .then(finishPendingClaim)
        .then((moved) =>
          // The account's uploads now include the ones the claim moved.
          moved > 0
            ? queryClient.invalidateQueries({ queryKey: accountKeys.uploads() })
            : undefined,
        )
        .catch((error: unknown) => console.warn('The claim could not be retried.', error));
    };
    const handleVisible = () => {
      if (document.visibilityState === 'visible') retry();
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', handleVisible);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [queryClient]);
}
