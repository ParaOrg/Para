import { retryingImport } from '@/shared/utils/retrying-import';

/**
 * The packing, a chunk of its own so the page's opening does not carry it: a send fetches it, and
 * the page fetches it ahead with the save screens, so a first send never waits on the network. A
 * fetch that failed (offline) is asked again afresh on the next send.
 */
export const loadPacking = retryingImport(() => import('./pack-recording'));
