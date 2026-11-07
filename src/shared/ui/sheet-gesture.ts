/**
 * How BottomSheet's handle and drags decide on a phone, for every card. It
 * also measures the status bar full height stands clear of (measureSafeTop). The
 * listeners that act on these are useSheetGestures'.
 */

/** How far a drag must travel before it counts as a pull rather than a tap. */
export const DRAG_PX = 24;

/**
 * Drops the `click` the browser sends after a tap on the handle. By the time
 * it is dispatched the sheet has already re-rendered, so the click is aimed
 * at whatever now lies under the finger: pulled down, the map, which would
 * read it as a tap on nothing and close the card; pulled up, whatever the
 * sheet now shows there — a hotspot's route, which it would open. Caught at
 * the capture phase on the document, before MapLibre or React sees it, and
 * only where the finger lifted: a tap on the sheet's ✕ right after lands
 * elsewhere, and is one the commuter meant. Forgotten when the next gesture
 * starts, if none came, not after a set time: on a busy page the click can
 * come a second after the finger lifted, and 300 ms was too short (seen on a
 * phone-sized page slowed 20×, and on the Philcoa card on GitHub's runners
 * once its routes flowed), so it landed on the RouteCard the sheet had pulled
 * up under it. Armed after a drag too: a finger's sends no click, and the
 * next touch ends the watch; a mouse's ends with a click on the handle it was
 * held on, which would toggle the sheet straight back (the handle's onClick).
 */
export function swallowTheTapsClick(x: number, y: number) {
  const hotspot = (e: MouseEvent) => {
    // No pointer's: Enter or Space, or a script. Left for the watch's own click.
    if (e.detail === 0) return;
    cleanup();
    // As far as a finger may travel and still tap.
    if (Math.hypot(e.clientX - x, e.clientY - y) > DRAG_PX) return;
    e.stopPropagation();
    e.preventDefault();
  };
  const cleanup = () => {
    document.removeEventListener('click', hotspot, true);
    document.removeEventListener('pointerdown', cleanup, true);
  };
  document.addEventListener('click', hotspot, true);
  document.addEventListener('pointerdown', cleanup, true);
}

/**
 * Where a sheet rests (the owner's rule): at Low, at full height, or at any height between, as a
 * share of the map's height. A drag lets go where it ends, but near Low, or flicked down, it goes
 * to Low (snapFor). Full height is the whole screen but a strip of map at the top, or all of
 * it for the route list (SheetShape).
 */
export type Snap = 'low' | 'full' | number;

/** What a sheet at `snap` is called on it (`data-snap`): a height between is `free`. */
export type SnapName = 'low' | 'full' | 'free';
/** The name a snap goes by, for `data-snap`. */
export const snapName = (snap: Snap): SnapName => (typeof snap === 'number' ? 'free' : snap);

/**
 * A flick faster than this, in pixels a millisecond: down, it takes the sheet to Low from
 * anywhere; up, it is no jump, and the sheet rests where the motion ends. The speed is read over
 * the last moves only.
 */
const FLICK = 1.25;

/** How far back the speed at release is read: only the finger's last moves count. */
const RECENT_MS = 100;

/** Let go this close above Low, a sheet goes to Low: Low's magnet, the owner's ~80 px. */
export const LOW_MAGNET_PX = 80;

/**
 * The height the camera frames a point above when the sheet is higher (framedAt), and the most the
 * buttons on the map rise with a sheet (Locator): 55% of the map.
 */
export const FRAMED_SHARE = 0.55;

/** A keyboard's or a tap's step on the handle: a third of the map's height. */
const STEP_SHARE = 1 / 3;

/**
 * What Low shows, the same for every card, the owner's rule (Figma 3817:6007,
 * 3869:5195): the notch, the header and the top of the first card, down past
 * its 24/32 title — cut to one line there (`sheet-low:`).
 */
export const LOW_PX = 133;

/**
 * What full height leaves of the map at the top, as Google Maps does: the status
 * bar's height, where the page runs behind it, and this strip under it, so
 * the commuter keeps their place: the owner's pick.
 */
export const MAX_STRIP_PX = 24;
const MAX_GAP_CSS = `calc(var(--map-safe-top) + ${MAX_STRIP_PX}px)`;

/**
 * The status bar's height as the page reads it (BottomSheet measures it): 0
 * where the page does not run behind it.
 */
let safeTop = 0;
function setSafeTop(px: number) {
  safeTop = Math.max(0, Math.round(px));
}

/** Whether measureSafeTop has read it: once a page. */
let safeTopRead = false;
/**
 * Reads the status bar's height, what full height leaves above its strip of map, as
 * `sheet` sees it: inside the studio's map box the variable is 0. 0 where the
 * page does not run behind the bar.
 */
export function measureSafeTop(sheet: Element | null) {
  if (safeTopRead || !sheet) return;
  safeTopRead = true;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;visibility:hidden;padding-top:var(--map-safe-top)';
  sheet.appendChild(probe);
  setSafeTop(parseFloat(getComputedStyle(probe).paddingTop) || 0);
  probe.remove();
}

/**
 * A sheet's own Low and full height, where they differ from every other card's: the route list's
 * Low shows its first card above the Controller, and its full height fills the screen
 * (BottomSheet's `shape`).
 */
export interface SheetShape {
  /** What Low shows, in px. */
  lowPx: number;
  /** Whether full height fills the screen, leaving no strip of map. */
  isMaxFull: boolean;
}

/** Every card's shape but the route list's: LOW_PX at Low, a strip of map above full height. */
export const CARD_SHAPE: SheetShape = { lowPx: LOW_PX, isMaxFull: false };

/** What full height leaves of the map above the sheet, as a CSS length. */
const maxGapCss = (shape: SheetShape) => (shape.isMaxFull ? '0px' : MAX_GAP_CSS);

/** What a sheet `h` tall, the map's height, shows at its two ends: Low and full. */
export function heightsFor(
  h: number,
  shape: SheetShape = CARD_SHAPE,
): { low: number; full: number } {
  const full = shape.isMaxFull ? h : Math.max(0, h - safeTop - MAX_STRIP_PX);
  // A tall Low (the route list's) on a short map, a phone on its side: never above the framed height.
  return { low: Math.min(shape.lowPx, Math.round(h * FRAMED_SHARE), full), full };
}

/**
 * The highest the buttons on the map ride over a fitted sheet (Locator's dockCap `top`, the ride's
 * Back): room for the locator's column under the status bar. A sheet raised past it covers them;
 * pulled down, it brings them back.
 */
export const DOCK_TOP_CSS = 'calc(var(--map-safe-top) + 128px)';

/** A sheet's two ends: what it shows at Low and at full (heightsFor), or a fitted sheet's (fitHeightsFor). */
export type SheetHeights = ReturnType<typeof heightsFor>;

/**
 * A fitted sheet's two ends (BottomSheet's `fits`): Low, and its content's height, `contentPx`,
 * never above full nor below Low. It moves freely between them.
 */
export function fitHeightsFor(h: number, contentPx: number): SheetHeights {
  const { low, full } = heightsFor(h);
  return { low, full: Math.max(low, Math.min(full, Math.round(contentPx))) };
}

/** What a sheet `h` tall shows at `snap`: Low's, full's, or its share of the map. */
export function shownAt(snap: Snap, h: number, heights: SheetHeights = heightsFor(h)): number {
  if (snap === 'low') return heights.low;
  if (snap === 'full') return heights.full;
  return Math.max(heights.low, Math.min(heights.full, Math.round(h * snap)));
}

/** The snap a sheet `h` tall rests at showing `shown` px: Low, full, or its share of the map. */
export function snapShowing(shown: number, h: number, heights: SheetHeights): Snap {
  if (shown <= heights.low + 1) return 'low';
  if (shown >= heights.full - 1) return 'full';
  return h > 0 ? shown / h : 'low';
}

/** How far down a sheet at `snap` slides, as a CSS length: `100%` is its own height, the map's. */
export function slide(snap: Snap, shape: SheetShape = CARD_SHAPE): string {
  const gap = maxGapCss(shape);
  if (snap === 'full') return gap;
  // Below full its bottom padding is off the screen: what shows stands clear
  // of a phone's home indicator by lifting it that much.
  // Low: never above the framed height, as heightsFor has it.
  const low = `calc(100% - min(${shape.lowPx}px, ${Math.round(FRAMED_SHARE * 100)}%) - env(safe-area-inset-bottom))`;
  // A share of the map, never below this sheet's own Low: sheets share one height, and the route
  // list's Low stands higher than a card's.
  if (typeof snap === 'number')
    return `max(${gap}, min(calc(${(1 - snap) * 100}% - env(safe-area-inset-bottom)), ${low}))`;
  return low;
}

/** How far down a sheet slides while `shown` px of it follow a finger. Never above full's top. */
export function slideShowing(shown: number, shape: SheetShape = CARD_SHAPE): string {
  return `max(${maxGapCss(shape)}, calc(100% - ${shown}px - env(safe-area-inset-bottom)))`;
}

/**
 * A finger, or a mouse, holding a sheet `h` tall that showed `from` when it took hold at
 * `startY`: how much shows as it moves, and where it rests let go (snapFor). Its speed at release
 * is the finger's over its last RECENT_MS only, so a swipe that slowed before lifting is read as
 * slow, however fast it began; held still 80 ms before lifting, it is a placement, not a flick.
 * The touch pull at full and the pointer drag share it.
 */
export function follow(
  startY: number,
  t: number,
  from: number,
  h: number,
  heights: SheetHeights = heightsFor(h),
) {
  let y = startY;
  let last = t;
  const moves: { at: number; t: number }[] = [{ at: startY, t }];
  const shown = (at: number) => Math.max(0, Math.min(heights.full, from + startY - at));
  return {
    move(at: number, now: number): number {
      y = at;
      last = now;
      moves.push({ at, t: now });
      while (moves.length > 2 && now - moves[1].t > RECENT_MS) moves.shift();
      return shown(at);
    },
    /** Where it rests let go at `at` (the last move's, when the release has no position). */
    release(now: number, at = y): Snap | 'close' {
      const first = moves.find((m) => last - m.t <= RECENT_MS) ?? moves[moves.length - 1];
      const dt = last - first.t;
      const v = now - last > 80 || dt <= 0 ? 0 : (first.at - y) / dt;
      return snapFor(shown(at), v, heights, h);
    },
  };
}

/**
 * Where a drag lets go (the owner's rule): where it ends, the sheet following the finger and
 * staying. Low alone keeps a magnet: let go within LOW_MAGNET_PX of it, or flicked down from
 * anywhere, the sheet goes to Low. A flick up is no jump. Pulled below half of Low it closes,
 * however slowly, and so does a flick down from Low. `shown` is how much of the sheet is on screen
 * as the finger lifts, `velocity` the finger's speed upwards in px/ms (negative: downwards), `h`
 * the map's height.
 */
export function snapFor(
  shown: number,
  velocity: number,
  heights: SheetHeights,
  h: number,
): Snap | 'close' {
  if (velocity <= -FLICK) return shown > heights.low + 1 ? 'low' : 'close';
  if (shown < heights.low / 2) return 'close';
  // The top first: a short sheet (a fitted one) may lie wholly within Low's magnet.
  if (shown >= heights.full - 1) return 'full';
  if (shown <= heights.low + LOW_MAGNET_PX) return 'low';
  return snapShowing(shown, h, heights);
}

/**
 * A tap on the handle, Enter on it, or a wheel's push (never from Low): a third of the map up
 * or down. `up` says which way; at either end the step turns round (BottomSheet keeps the
 * way). Stepping down to within LOW_MAGNET_PX of Low lands on Low.
 */
export function stepFrom(snap: Snap, up: boolean, h: number, heights: SheetHeights): Snap {
  const shown = shownAt(snap, h, heights) + (up ? 1 : -1) * Math.round(h * STEP_SHARE);
  if (!up && shown <= heights.low + LOW_MAGNET_PX) return 'low';
  return snapShowing(Math.max(heights.low, Math.min(heights.full, shown)), h, heights);
}
