/**
 * The room a BottomSheet leaves on the map, for the camera: where a point it
 * glides to should sit, and the padding a whole route is fitted with. No
 * React; the DOM is read only by the three wrappers the card hooks call, and
 * the arithmetic under them takes rects.
 */

import { aboveMiddle, shownAt, type Snap } from './sheet-gesture';

/** MapLibre's fit padding, a side at a time. */
export interface Room {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** What the room is worked out from: a box on the page, as getBoundingClientRect gives it. */
export interface Rect extends Room {
  height: number;
}

/**
 * Where a point the camera glides to should sit, from the map's centre, so
 * the dock does not cover it: in the middle of the map left showing — to the
 * dock's right from `@float:`, where it sits in the top-left corner, above it
 * where it is docked along the bottom. For MapLibre's `offset`, measured as
 * the glide starts: on a phone the sheet shows as much as its snap does — or,
 * given `snap`, as much as it will once there, for a sheet on its way.
 */
export function clearOfDock(
  map: HTMLElement,
  dock: HTMLElement | null,
  snap?: Snap,
): [number, number] {
  if (!dock || dock.hidden) return [0, 0];
  return clearOfRects(
    map.getBoundingClientRect(),
    dock.getBoundingClientRect(),
    snap ? showsAt(dock, snap) : undefined,
  );
}

/**
 * clearOfDock's arithmetic, over the map's and the dock's rects: `shows` is
 * how much of a docked sheet shows, or, left out, what stands above the
 * dock's top now. No dock, or a hidden one, is null.
 */
export function clearOfRects(map: Rect, dock: Rect | null, shows?: number): [number, number] {
  if (!dock) return [0, 0];
  // In the corner, short of the map's right edge: the room is to its right.
  if (dock.right < map.right - 1) return [Math.max(0, dock.right - map.left) / 2, 0];
  // Along the bottom: the room is above it.
  return [0, -Math.max(0, shows ?? map.bottom - dock.top) / 2];
}

/**
 * The height a sheet is measured at when the camera glides to a point under
 * it: its own, or Middle when it is higher — the sheet stays put (the owner,
 * 2026-10-01), and what the camera brings in is there to see when it comes
 * down. A whole route fitted is framed at the sheet's own height (roomBeside).
 */
export function framedAt(snap: Snap): Snap {
  return aboveMiddle(snap) ? 'middle' : snap;
}

/**
 * Between a route fitted whole and the map's edges, or the sheet's: room for
 * an end's name over its circle (EndTitles), 28 tall marked or not since the
 * owner's labels of 2026-10-13 (a marked one was 32 from 2026-10-12, and the
 * top margin 4 more for it).
 */
export const FIT_MARGIN_PX = 48;
/** The least map a whole route is fitted into, the margins given up for it where the sheet leaves less. */
export const FIT_ROOM_MIN_PX = 48;

/**
 * The room a sheet leaves for a whole route the camera fits, as MapLibre's
 * fit padding: beside the sheet where it floats in the corner, above it
 * where it is docked along the bottom, at its own height (the owner,
 * 2026-10-01: in close above Low, out above Middle). Where it leaves less
 * than FIT_ROOM_MIN_PX — Max, on a phone the whole screen — at Middle's
 * (`framedAt`), so the route is there to see as it comes down.
 */
export function roomBeside(map: HTMLElement, dock: HTMLElement | null, snap: Snap): Room {
  if (!dock || dock.hidden) return roomFromRects(map.getBoundingClientRect(), null, 0, 0, snap);
  return roomFromRects(
    map.getBoundingClientRect(),
    dock.getBoundingClientRect(),
    showsAt(dock, snap),
    showsAt(dock, framedAt(snap)),
    snap,
  );
}

/**
 * roomBeside's arithmetic, over the map's and the dock's rects: `shows` is
 * how much of the docked sheet shows at `snap`, `showsFramed` at
 * `framedAt(snap)`. No dock, or a hidden one, is null.
 */
export function roomFromRects(
  map: Rect,
  dock: Rect | null,
  shows: number,
  showsFramed: number,
  snap: Snap,
): Room {
  const room = {
    top: FIT_MARGIN_PX,
    bottom: FIT_MARGIN_PX,
    left: FIT_MARGIN_PX,
    right: FIT_MARGIN_PX,
  };
  if (!dock) return room;
  if (dock.right < map.right - 1) {
    room.left += Math.max(0, dock.right - map.left);
    return room;
  }
  let shown = shows;
  // Max leaves only a strip of map (MAX_STRIP_PX): framed as at Middle, as when it covered it all.
  if (snap === 'max' || map.height - shown < FIT_ROOM_MIN_PX) shown = showsFramed;
  // A thin strip above a tall sheet: the margins give way, so the route still fits.
  const margin = Math.max(0, Math.min(FIT_MARGIN_PX, (map.height - shown - FIT_ROOM_MIN_PX) / 2));
  room.top = margin;
  room.bottom = shown + margin;
  return room;
}

/**
 * How much of a docked sheet shows at `snap`: below Max, lifted clear of a
 * phone's home indicator by its bottom padding, as `slide` lifts it.
 */
function showsAt(sheet: HTMLElement, snap: Snap): number {
  const h = sheet.offsetHeight;
  if (snap === 'max') return shownAt('max', h);
  return shownAt(snap, h) + (parseFloat(getComputedStyle(sheet).paddingBottom) || 0);
}

/**
 * The camera is about to glide to a point on the map — a hintuan picked on
 * a trip, one of its ends, another box of a place. The sheet stays at the
 * height it was left at (the owner's ask, 2026-10-01: "since the card can
 * settle anywhere, don't move the bottomsheet to the middle"; until then
 * Max came down to Middle). Returns where the point should sit
 * (clearOfDock): above the sheet at `framedAt`'s height, or beside it in the
 * corner.
 */
export function clearOfSheet(
  map: HTMLElement,
  dock: HTMLElement | null,
  snap: Snap,
): [number, number] {
  return clearOfDock(map, dock, framedAt(snap));
}
