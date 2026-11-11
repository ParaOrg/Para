import { retryingImport } from '@/shared/utils/retrying-import';

import { readPendingClaim } from './claim-token';
import type { ContributeClient } from './contribute-client';

/**
 * The claim of earlier uploads, a chunk of its own so the page's opening does not carry it: it is
 * needed only when a sign-in begins a claim or the phone keeps one to finish, never to draw the page.
 */
export const loadEarlierIdentity = retryingImport(() => import('./earlier-identity'));

/** Finishes the claim this phone kept, if any, without waiting for it; nothing is fetched without one. */
export function finishKeptClaim(client: ContributeClient): void {
  if (!readPendingClaim()) return;
  void loadEarlierIdentity()
    .then(({ finishPendingClaim }) => finishPendingClaim(client))
    .catch((error: unknown) => console.warn('The claim code did not load.', error));
}
