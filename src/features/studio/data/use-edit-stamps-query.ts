import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { editStampKeys } from './edit-stamp-keys';
import { fetchEditStamps } from './edit-stamps';
import { subscribeReviewChanges } from './review-events';

/**
 * Every route's and hotspot's Author, Date published and Last edited
 * (edit-stamps.ts). Read again after any save, publish or unpublish in this
 * tab, which each announce themselves (review-events.ts).
 */
export function useEditStampsQuery() {
  const client = useQueryClient();
  useEffect(
    () =>
      subscribeReviewChanges(() => {
        void client.invalidateQueries({ queryKey: editStampKeys.all() });
      }),
    [client],
  );
  return useQuery({ queryKey: editStampKeys.all(), queryFn: fetchEditStamps });
}
