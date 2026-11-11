import { lazy } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

/**
 * The question about earlier recordings, a chunk of its own so the page's opening does not carry
 * it: it is asked once, after a sign-in, never as the page first opens. Ready fetches it ahead with
 * the recording screens (use-screen-warmup.ts), so it never waits on the network when it is asked.
 */
export const loadEarlierRecordingsPanel = retryingImport(
  () => import('./earlier-recordings-panel'),
);

export const EarlierRecordingsPanel = lazy(() =>
  loadEarlierRecordingsPanel().then((module) => ({ default: module.EarlierRecordingsPanel })),
);
