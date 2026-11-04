import { useQuery } from '@tanstack/react-query';

import type { HotspotRow } from '@/features/routes/model/hotspots';

import { draftOf } from './drafts';
import { STUDIO_DRAFTS } from './flags';
import { hotspotToEdit } from './hotspot-to-edit';
import { reviewKeys } from './review-keys';

/**
 * The hotspot as Edit opens it (hotspot-to-edit.ts), read under the key the
 * card's lock reads the draft by (use-draft-lock.ts). The draft is parsed in
 * `select`, so a payload that does not parse is this query's error. Off with
 * drafts off, and with no hotspot.
 */
export function useHotspotToEditQuery(hotspot: HotspotRow | null) {
  const hotspotId = hotspot?.id ?? '';
  return useQuery({
    queryKey: reviewKeys.draftOf('hotspot', hotspotId),
    queryFn: () => draftOf('hotspot', hotspotId),
    select: (draft) => (hotspot ? hotspotToEdit(hotspot, draft) : null),
    enabled: STUDIO_DRAFTS && hotspot !== null,
  });
}
