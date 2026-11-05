import type { DraftKind } from '../data/review-schema';
import { useEditStampsQuery } from '../data/use-edit-stamps-query';

/** Line detail's dates, in Manila time, as the studio's contributions list says them. */
const STAMP_DATE = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** An ISO time as Line detail says it; null when there is none or it cannot be read. */
export function stampDate(iso: string | null): string | null {
  if (iso === null) return null;
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : STAMP_DATE.format(time);
}

interface LineStamps {
  author: string | null;
  datePublished: string | null;
  lastEdited: string | null;
}

/**
 * Line detail's Author, Date published and Last edited for a route or a hotspot
 * (useEditStampsQuery). All null for one not saved yet, and while the stamps are read: Line
 * detail says "--" for each.
 */
export function useLineStamps(kind: DraftKind, id: string | null): LineStamps {
  const query = useEditStampsQuery();
  const stamps = kind === 'route' ? query.data?.routes : query.data?.hotspots;
  const stamp = id === null ? undefined : stamps?.get(id);
  return {
    author: stamp?.authorName ?? null,
    datePublished: stampDate(stamp?.publishedAt ?? null),
    lastEdited: stampDate(stamp?.lastEditedAt ?? null),
  };
}
