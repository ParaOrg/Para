import { retryingImport } from '@/shared/utils/retrying-import';

/**
 * The phone's requests about its uploads (send one, list those still in Para), a chunk of its own
 * so the page's opening does not carry them: each waits on the database client, itself fetched
 * later, and a send fetches them with the packing it waits on first.
 */
export const loadContributionRequests = retryingImport(() => import('./contribution-requests'));
