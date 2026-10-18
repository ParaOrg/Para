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
}: {
  children: ReactNode;
  hasConflict?: boolean;
  isEmpty?: boolean;
}) {
  const [client] = useState(() => {
    const next = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false, refetchOnMount: false } },
    });
    next.setQueryData(reviewKeys.comparison(STORY_DRAFT.id, STORY_DRAFT.revision), {
      ...STORY_COMPARISON,
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
