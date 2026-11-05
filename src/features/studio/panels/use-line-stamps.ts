import type { DraftKind } from '../data/review-schema';
import { useEditStampsQuery } from '../data/use-edit-stamps-query';

/** Line detail's dates, in Manila time: "5 Nov 2026, 3:42 PM", as the owner chose. */
const STAMP_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** What an author with no name on file is called, as the draft lock says it. */
const UNNAMED_AUTHOR = 'another editor';

/** An ISO time as Line detail says it; null when there is none or it cannot be read. */
export function stampDate(iso: string | null): string | null {
  if (iso === null) return null;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    STAMP_PARTS.formatToParts(time).find((p) => p.type === type)?.value ?? '';
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod').toUpperCase()}`;
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
    author: stamp?.authorName ?? (stamp?.authorId ? UNNAMED_AUTHOR : null),
    datePublished: stampDate(stamp?.publishedAt ?? null),
    lastEdited: stampDate(stamp?.lastEditedAt ?? null),
  };
}
