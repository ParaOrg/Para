/**
 * How BottomSheet's handle and drags decide on a phone, for every card. It
 * also measures the status bar Max stands clear of (measureSafeTop). The
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
 * The three heights of BottomSheetConfiguration (Figma 3815:5637), on a
 * phone: Low, the header and a trip's origin along the bottom (3814:3976);
 * Middle, two fifths of the screen, where a trip opens (3813:3755, 3815:4040);
 * Max, the whole screen, the header at the top and the rest scrolling under
 * it (3815:4306). A drag always lets go on one of the three; a number, the
 * share of Max a sheet shows, is a height set some other way.
 */
export type Snap = 'low' | 'middle' | 'max' | number;

/** What a sheet at `snap` is called on it (`data-snap`) and by a screen reader: a free height is `free`. */
export type SnapName = 'low' | 'middle' | 'max' | 'free';
/** The name a snap goes by, for `data-snap` and the handle's label. */
export const snapName = (snap: Snap): SnapName => (typeof snap === 'number' ? 'free' : snap);

/** Covering more of the map than Middle does: Max, or a free height. */
export const aboveMiddle = (snap: Snap) => snap === 'max' || typeof snap === 'number';

/**
 * Where a tap on the handle, or Enter on it, takes the sheet: round, Low →
 * Middle → Max → Low, the owner's defaults; from a free height, on up to Max.
 * Pulls go by snapFor.
 */
export function snapAfterTap(snap: Snap): Snap {
  return snap === 'low' ? 'middle' : snap === 'max' ? 'low' : 'max';
}

/**
 * A flick faster than this, in pixels a millisecond, goes to the end its way
 * even down, where a slower swipe steps down one height: 0.5 ÷ 0.4, the
 * owner's pick from trying it. The speed is read over the last moves only.
 */
const FLICK = 1.25;

/** How far back the speed at release is read: only the finger's last moves count. */
const RECENT_MS = 100;

/** Middle shows this much of the map: 55%, the owner's pick. */
const MIDDLE = 0.55;

/**
 * What Low shows, the same for every card, the owner's rule (Figma 3817:6007,
 * 3869:5195): the notch, the header and the top of the first card, down past
 * its 24/32 title — cut to one line there (`sheet-low:`).
 */
export const LOW_PX = 133;

/**
 * What Max leaves of the map at the top, as Google Maps does: the status
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
 * Reads the status bar's height, what Max leaves above its strip of map, as
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

/** What each magnet shows of a sheet `h` tall, the map's height. */
export function heightsFor(h: number): Record<SnapName & ('low' | 'middle' | 'max'), number> {
  return {
    low: LOW_PX,
    middle: Math.round(h * MIDDLE),
    max: Math.max(0, h - safeTop - MAX_STRIP_PX),
  };
}

/** What a sheet `h` tall shows at `snap`, a free height's included: a share of Max's. */
export function shownAt(snap: Snap, h: number): number {
  return typeof snap === 'number' ? Math.round(heightsFor(h).max * snap) : heightsFor(h)[snap];
}

/** How far down a sheet at `snap` slides, as a CSS length: `100%` is its own height, the map's. */
export function slide(snap: Snap): string {
  if (snap === 'max') return MAX_GAP_CSS;
  // Below Max its bottom padding is off the screen: what shows stands clear
  // of a phone's home indicator by lifting it that much.
  if (snap === 'middle') return `calc(${(1 - MIDDLE) * 100}% - env(safe-area-inset-bottom))`;
  if (typeof snap === 'number')
    return `calc(100% - ${snap} * (100% - ${MAX_GAP_CSS}) - env(safe-area-inset-bottom))`;
  return `calc(100% - ${LOW_PX}px - env(safe-area-inset-bottom))`;
}

/** How far down a sheet slides while `shown` px of it follow a finger. Never above Max's top. */
export function slideShowing(shown: number): string {
  return `max(${MAX_GAP_CSS}, calc(100% - ${shown}px - env(safe-area-inset-bottom)))`;
}

/**
 * A finger, or a mouse, holding a sheet `h` tall that showed `from` when
 * it took hold at `startY`: how much shows as it moves, and where it lands
 * let go (snapFor). Its speed at release is the finger's over its last
 * RECENT_MS only, so a swipe that slowed before lifting is read as slow,
 * however fast it began; held still 80 ms before lifting, it is a
 * placement, not a flick. The touch pull at Max and the pointer drag share it.
 */
export function follow(startY: number, t: number, from: number, h: number) {
  const heights = heightsFor(h);
  const max = heights.max;
  let y = startY;
  let last = t;
  const moves: { at: number; t: number }[] = [{ at: startY, t }];
  const shown = (at: number) => Math.max(0, Math.min(max, from + startY - at));
  return {
    move(at: number, now: number): number {
      y = at;
      last = now;
      moves.push({ at, t: now });
      while (moves.length > 2 && now - moves[1].t > RECENT_MS) moves.shift();
      return shown(at);
    },
    /** Where it lands let go at `at` (the last move's, when the release has no position). */
    release(now: number, at = y): Snap | 'close' {
      const first = moves.find((m) => last - m.t <= RECENT_MS) ?? moves[moves.length - 1];
      const dt = last - first.t;
      const v = now - last > 80 || dt <= 0 ? 0 : (first.at - y) / dt;
      return snapFor(shown(at), v, heights, from);
    },
  };
}

/**
 * Where a drag lets go, as Google's and Apple's maps do: the sheet follows the
 * finger. `shown` is how much of the sheet is on screen as the finger lifts,
 * `heights` what each magnet shows, `velocity` the finger's speed upwards in
 * px/ms (negative: downwards), `from` how much showed when it took hold.
 * A flick goes to the end in its direction: up, to Max, from Low or Middle
 * alike; down, to Low, from Max or Middle alike. A slower swipe moves one
 * height: up, Low to Middle and Middle to Max; down, Max to Middle and Middle
 * to Low. It goes on a second height when let go past halfway to it: from Low
 * to Max above halfway between Middle and Max, from Max to Low below halfway
 * between Middle and Low. It never rests between heights. A sheet pulled below
 * half of Low closes, however slowly, and so does a flick down from Low. A
 * move shorter than a tap's returns to the height nearest where it was let go.
 */
export function snapFor(
  shown: number,
  velocity: number,
  heights: ReturnType<typeof heightsFor>,
  from: number,
): Snap | 'close' {
  if (velocity >= FLICK) return 'max';
  if (velocity <= -FLICK) return shown > heights.low + 1 ? 'low' : 'close';
  if (shown < heights.low / 2) return 'close';
  const travelled = shown - from;
  if (travelled > DRAG_PX) {
    if (from >= heights.middle - 1) return 'max';
    return shown > (heights.middle + heights.max) / 2 ? 'max' : 'middle';
  }
  if (travelled < -DRAG_PX) {
    if (from <= heights.middle + 1) return 'low';
    return shown < (heights.low + heights.middle) / 2 ? 'low' : 'middle';
  }
  return nearest(shown, heights);
}

/** The height that shows closest to `shown`: Low, Middle or Max. */
function nearest(shown: number, heights: ReturnType<typeof heightsFor>): 'low' | 'middle' | 'max' {
  const stops = ['low', 'middle', 'max'] as const;
  return stops.reduce((best, stop) =>
    Math.abs(heights[stop] - shown) < Math.abs(heights[best] - shown) ? stop : best,
  );
}
