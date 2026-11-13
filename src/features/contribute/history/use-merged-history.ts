import { useMemo } from 'react';

import { mergeHistory } from './history-merge';
import { uploadFactsOf } from './ride-facts';
import type { AccountUpload } from '../api/account-uploads';
import type { Recording } from '../storage/recording-schema';

/**
 * History's list (history-merge.ts) and the facts of each upload from another phone, as the same
 * objects until the uploads or this phone's list change. A ride from another phone that was made
 * anew on each render had its summary card drawn again each time its screen rendered.
 */
export function useMergedHistory(
  saved: readonly Recording[],
  accountUploads: readonly AccountUpload[] | undefined,
  hidden: ReadonlySet<string>,
) {
  const recordings = useMemo(
    () => mergeHistory(saved, accountUploads ?? [], hidden),
    [saved, accountUploads, hidden],
  );
  const uploadFacts = useMemo(
    () => new Map((accountUploads ?? []).map((upload) => [upload.id, uploadFactsOf(upload)])),
    [accountUploads],
  );
  return { recordings, uploadFacts };
}
