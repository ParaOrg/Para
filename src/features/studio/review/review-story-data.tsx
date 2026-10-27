import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import type { ReviewComparison } from '../data/review-comparison';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';

export const STORY_DRAFT: DraftRow = {
  id: 'preview-draft',
  kind: 'hotspot',
  subject_id: 'preview-place',
  is_new: false,
  base_revision: 3,
  revision: 2,
  status: 'pending',
  editor_id: null,
  note: null,
  created_at: '2026-10-18T10:00:00Z',
  updated_at: '2026-10-18T10:00:00Z',
  submitted_at: '2026-10-18T10:00:00Z',
  payload: {
    version: 1,
    stop: {
      name: 'Palma Hall',
      informal: null,
      aliases: [],
      kind: 'hintuan',
      note: 'Updated loading point',
      line: null,
      point: { type: 'Point', coordinates: [121.065, 14.653] },
      area: null,
    },
    links: [],
  },
};
export const STORY_COMPARISON: ReviewComparison = {
  approved: {
    version: 1,
    stop: {
      name: 'Palma Hall',
      note: 'Old loading point',
      point: { type: 'Point', coordinates: [121.064, 14.653] },
    },
    links: [],
  },
  proposed:
    STORY_DRAFT.payload && typeof STORY_DRAFT.payload === 'object'
      ? { ...STORY_DRAFT.payload }
      : {},
  currentRevision: 3,
  hasConflict: false,
  dependencies: [],
};
const LINE = {
  type: 'LineString',
  coordinates: [
    [121.05, 14.71],
    [121.06, 14.7],
  ],
};
const ROUTE = {
  signboard: 'Fairview – Capitol',
  mode: 'jeepney',
  fare_note: null,
  via: null,
  head_stop_id: 'preview-fairview',
  tail_stop_id: 'preview-capitol',
  is_loop: false,
};
const way = (id: string, reversed: boolean, isDrawn: boolean) => ({
  id,
  reversed,
  shape: isDrawn ? LINE : null,
  control_points: isDrawn ? LINE.coordinates : [],
  segments: [],
  links: [],
});

/** A route draft that takes away its Pabalik line, as Delete on that way saves it. */
export const STORY_REMOVAL_DRAFT: DraftRow = {
  ...STORY_DRAFT,
  id: 'preview-removal',
  kind: 'route',
  subject_id: 'preview-route',
  status: 'draft',
  submitted_at: null,
  payload: {
    version: 1,
    route: ROUTE,
    directions: [way('papunta', false, true), way('pabalik', true, false)],
  },
};
export const STORY_REMOVAL: ReviewComparison = {
  approved: {
    version: 1,
    route: ROUTE,
    directions: [way('papunta', false, true), way('pabalik', true, true)],
  },
  proposed: {
    version: 1,
    route: ROUTE,
    directions: [way('papunta', false, true), way('pabalik', true, false)],
  },
  currentRevision: 3,
  hasConflict: false,
  dependencies: [],
};

const PUBLICATION = {
  publishedAt: '2026-10-18T09:00:00Z',
  subjects: [
    {
      id: 'place',
      kind: 'hotspot',
      label: 'Palma Hall',
      status: 'approved',
      revision: 3,
      updatedAt: '2026-10-18T10:00:00Z',
      statusAt: '2026-10-18T09:00:00Z',
    },
  ],
  waiting: [
    {
      id: 'place',
      kind: 'hotspot',
      label: 'Palma Hall',
      status: 'approved',
      revision: 3,
      updatedAt: '2026-10-18T10:00:00Z',
      statusAt: '2026-10-18T09:00:00Z',
    },
  ],
};

export function ReviewStoryData({
  children,
  hasConflict = false,
  isEmpty = false,
  draft = STORY_DRAFT,
  comparison = STORY_COMPARISON,
}: {
  children: ReactNode;
  hasConflict?: boolean;
  isEmpty?: boolean;
  /** The draft whose comparison is preloaded, and that comparison. */
  draft?: DraftRow;
  comparison?: ReviewComparison;
}) {
  const [client] = useState(() => {
    const next = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false } },
    });
    next.setQueryData(reviewKeys.comparison(draft.id, draft.revision), {
      ...comparison,
      hasConflict,
    });
    next.setQueryData(
      reviewKeys.publication(),
      isEmpty ? { ...PUBLICATION, subjects: [], waiting: [] } : PUBLICATION,
    );
    return next;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
