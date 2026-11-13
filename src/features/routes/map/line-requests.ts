import type { LineStringGeoJSON } from '../model/routes';

/** The directions whose full line has been asked for, and those whose read failed. */
export interface LineBooks {
  requested: Set<string>;
  failed: Set<string>;
}

/**
 * Asks for a direction's full line and keeps the answer, for the load of the routes it was asked
 * under only. `isCurrent` says, when the answer comes, whether that load is still the latest. A
 * reload clears the lines and these books: an answer to the load before it must neither put its
 * line back on the map nor mark the new load's own request as failed.
 */
export function requestLine(
  id: string,
  loadLine: (id: string) => Promise<LineStringGeoJSON | null>,
  books: LineBooks,
  isCurrent: () => boolean,
  keep: (line: LineStringGeoJSON) => void,
): void {
  books.requested.add(id);
  books.failed.delete(id);
  loadLine(id).then(
    (line) => {
      if (line && isCurrent()) keep(line);
    },
    () => {
      if (!isCurrent()) return;
      books.requested.delete(id);
      books.failed.add(id);
    },
  );
}
