/**
 * The basemap tiles the public map asked for, noted so that the service
 * worker can keep them after a first visit (src/features/published-map/pwa.ts, warmCaches).
 *
 * On a first visit the page asks for everything before the new worker takes
 * control, so none of it reaches the worker's caches. The map opens on its
 * routes, so every tile of the first screen comes before the worker does, and
 * without these a commuter who installed and went offline would find the routes
 * on a bare map (pwa-test's "basemap-tiles holds tiles"). Once the worker
 * controls the page, warmCaches asks for these again, from the browser's own
 * cache, and this time the worker keeps them.
 *
 * `note` is the map's transformRequest: it changes no request (MapLibre
 * keeps the URL as it was when it returns nothing, request_manager.ts) and
 * notes each tile's address, once, up to `kept`. `take` hands them over once
 * and stops the noting: from then on the page's own requests go through the
 * worker.
 *
 * Not always the map's, though. MapLibre asks for tiles from its own worker,
 * started as the page is read (map-view.tsx, prewarm), and a worker still
 * loading its script when the service worker claims the page is left outside
 * it for good. The two load the same files, so on a fast connection they finish
 * close together: now and then the map's worker is the one left out, its tiles
 * go out direct for the whole visit, and any asked after `take` would never be
 * kept. So with a taker set (`later`) the noting goes on past `take` until the
 * map says its first screen is in (`firstScreenIn`), and the tiles asked
 * meanwhile are handed to the taker, once, to be asked for again by the page.
 * One the worker did answer is then answered again from its cache.
 */
export const TILES_KEPT = 64;

type TilesTaker = (tiles: string[]) => void;

export function tileNotes(kept = TILES_KEPT) {
  // Every tile noted, taken or not: none is handed over twice, and `kept` counts them all.
  const noted = new Set<string>();
  const asked: string[] = [];
  let noting = true;
  let isTaken = false;
  let isFirstScreenIn = false;
  let taker: TilesTaker | null = null;
  return {
    note(url: string, type?: string): undefined {
      if (noting && type === 'Tile' && noted.size < kept && !noted.has(url)) {
        noted.add(url);
        asked.push(url);
      }
      return undefined;
    },
    take(): string[] {
      isTaken = true;
      if (!taker || isFirstScreenIn) noting = false;
      return asked.splice(0);
    },
    /** Who is handed the tiles asked between `take` and the first screen coming in. */
    later(next: TilesTaker): void {
      taker = next;
    },
    /** The map's first screen is in: every tile of it has been asked for. */
    firstScreenIn(): void {
      isFirstScreenIn = true;
      if (!isTaken || !noting) return;
      noting = false;
      const rest = asked.splice(0);
      if (rest.length > 0) taker?.(rest);
    },
  };
}

const notes = tileNotes();
export const noteTile = notes.note;
export const takeTilesAsked = notes.take;
export const takeTilesAskedLater = notes.later;
export const tilesFirstScreenIn = notes.firstScreenIn;
