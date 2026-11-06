/**
 * The room a BottomSheet leaves on the map, for the camera: where a point it
 * glides to should sit, and the padding a whole route is fitted with. No
 * React; the DOM is read only by the three wrappers the card hooks call, and
 * the arithmetic under them takes rects.
 */

import {
  CARD_SHAPE,
  FRAMED_SHARE,
  heightsFor,
  shownAt,
  type SheetShape,
  type Snap,
} from './sheet-gesture';

/** MapLibre's fit padding, a side at a time. */
export interface Room {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** What the room is worked out from: a box on the page, as getBoundingClientRect gives it. */
interface Rect extends Room {
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
    dockRect(dock),
    snap ? showsAt(dock, snap) : undefined,
  );
}

/**
 * The dock's box on the page, with what stands beside it: a docked list's footer, its Controller,
 * sits over the map at its right (BottomSheet's `floats="dock"`), and the camera keeps clear of it
 * too. Along the bottom the footer is inside the sheet, and the box is the sheet's own.
 */
function dockRect(dock: HTMLElement): Rect {
  const sheet = dock.getBoundingClientRect();
  const footer = dock.querySelector('[data-sheet-footer]')?.getBoundingClientRect();
  if (!footer || footer.left < sheet.right - 1) return sheet;
  return {
    top: sheet.top,
    bottom: sheet.bottom,
    left: sheet.left,
    right: Math.max(sheet.right, footer.right),
    height: sheet.height,
  };
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
 * it: its own, or FRAMED_SHARE of the map when it is higher — the sheet stays
 * put, as the owner keeps it, and what the camera brings in is there to see
 * when it comes down. A whole route fitted is framed at the sheet's own
 * height (roomBeside).
 */
export function framedAt(snap: Snap): Snap {
  if (snap === 'full') return FRAMED_SHARE;
  return typeof snap === 'number' ? Math.min(snap, FRAMED_SHARE) : snap;
}

/**
 * Between a route fitted whole and the map's edges, or the sheet's: room for
 * an end's name over its circle (EndTitles), 28 tall, marked or not.
 */
export const FIT_MARGIN_PX = 48;
/** The least map a whole route is fitted into, the margins given up for it where the sheet leaves less. */
export const FIT_ROOM_MIN_PX = 48;

/**
 * The room a sheet leaves for a whole route the camera fits, as MapLibre's
 * fit padding: beside the sheet where it floats in the corner, above it where
 * it is docked along the bottom, at its own height (the owner's pick: in
 * close above Low, out above a raised sheet). Where it leaves less than
 * FIT_ROOM_MIN_PX — full height, which leaves only a strip of map
 * (MAX_STRIP_PX) — at framedAt's, so the route is there to see as it comes
 * down.
 */
export function roomBeside(map: HTMLElement, dock: HTMLElement | null, snap: Snap): Room {
  if (!dock || dock.hidden) return roomFromRects(map.getBoundingClientRect(), null, 0, 0, snap);
  return roomFromRects(
    map.getBoundingClientRect(),
    dockRect(dock),
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
  // Full height leaves only a strip of map (MAX_STRIP_PX): framed at framedAt's, as when it covered it all.
  if (snap === 'full' || map.height - shown < FIT_ROOM_MIN_PX) shown = showsFramed;
  // A thin strip above a tall sheet: the margins give way, so the route still fits.
  const margin = Math.max(0, Math.min(FIT_MARGIN_PX, (map.height - shown - FIT_ROOM_MIN_PX) / 2));
  room.top = margin;
  room.bottom = shown + margin;
  return room;
}

/**
 * How much of a docked sheet shows at `snap`: below full height, lifted clear
 * of a phone's home indicator by its bottom padding, as `slide` lifts it.
 */
function showsAt(sheet: HTMLElement, snap: Snap): number {
  const h = sheet.offsetHeight;
  const heights = heightsFor(h, shapeOf(sheet));
  if (snap === 'full') return shownAt('full', h, heights);
  return shownAt(snap, h, heights) + (parseFloat(getComputedStyle(sheet).paddingBottom) || 0);
}

/** The sheet's own Low and Max, as BottomSheet writes them on it (its `shape`). */
function shapeOf(sheet: HTMLElement): SheetShape {
  const lowPx = Number(sheet.dataset.lowPx);
  return {
    lowPx: Number.isFinite(lowPx) && lowPx > 0 ? lowPx : CARD_SHAPE.lowPx,
    isMaxFull: sheet.hasAttribute('data-max-full'),
  };
}

/**
 * The camera is about to glide to a point on the map — a hintuan picked on a
 * trip, one of its ends, another box of a place. The sheet stays at the
 * height it was left at, the owner's pick, since the card can settle
 * anywhere. Returns where the point should sit (clearOfDock): above the sheet
 * at `framedAt`'s height, or beside it in the corner.
 */
export function clearOfSheet(
  map: HTMLElement,
  dock: HTMLElement | null,
  snap: Snap,
): [number, number] {
  return clearOfDock(map, dock, framedAt(snap));
}

/** A sheet whose top is within this share of the map's top covers it (isMapOutOfSight): above 90%. */
const COVERED_ABOVE = 0.1;

/**
 * Whether the map under `map` is out of sight or on the move under a finger: a docked sheet raised
 * over all but its top tenth, or a finger (or a mouse) holding a sheet (`data-dock-dragging`,
 * BottomSheet). What only moves for the eye, as the flowing chevrons do, waits meanwhile: each of
 * its steps costs a redraw the sheet's own frames then lack. A sheet floating beside the map covers
 * none.
 */
export function isMapOutOfSight(map: HTMLElement): boolean {
  const host = map.closest('[data-dock-host]');
  if (!host) return false;
  if (host.hasAttribute('data-dock-dragging')) return true;
  const sheets = host.querySelectorAll<HTMLElement>(
    '[role="dialog"][data-snap]:not([data-snap="low"]):not([hidden])',
  );
  const under = map.getBoundingClientRect();
  // Docked along the bottom: as wide as the map, its top above the map's top tenth's foot.
  return [...sheets].some((sheet) => {
    const over = sheet.getBoundingClientRect();
    return over.width >= under.width - 1 && over.top - under.top < under.height * COVERED_ABOVE;
  });
}
