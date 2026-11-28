import { useLayoutEffect, type RefObject } from 'react';

import { DRAG_PX, follow, shownAt, stepFrom, type SheetHeights, type Snap } from './sheet-gesture';

/** What the pull reads of the sheet as it is now, written as each render commits. */
export interface SheetNow {
  snap: Snap;
  heightsOf: (h: number) => SheetHeights;
  /** Rests the sheet at `next`, as a tap or a key does. */
  settle: (next: Snap | 'close') => void;
  /** A drag let go: where its momentum carries the sheet, and the list's own coast after. */
  throwTo: (
    track: ReturnType<typeof follow>,
    now: number,
    at?: number,
    isListDriven?: boolean,
  ) => void;
  /** A finger on the sheet: a glide still to land lands first, and a list's coast stops. */
  touched: () => Snap | null;
}

interface SheetPullOptions {
  sheet: RefObject<HTMLDivElement | null>;
  body: RefObject<HTMLDivElement | null>;
  now: RefObject<SheetNow>;
  docked: () => boolean;
  /** A finger has the sheet: the glide is off. */
  hold: () => void;
  /** Writes the sheet's position for `shown` px on show. */
  show: (shown: number) => void;
}

/**
 * At full height, the pull down from the list's top: touch events, as the browser takes a scroll
 * and cancels the pointer, but a non-passive touchmove can still be claimed. One gesture: a list
 * scrolled up to its top under the finger hands on to the sheet, which then follows the finger
 * down; pulled back above where it took hold, the list scrolls again. A wheel's deliberate push
 * steps the sheet a third, as a tap on the handle does, never raising it from Low.
 */
export function useSheetPull({
  sheet: own,
  body: bodyRef,
  now,
  docked,
  hold,
  show,
}: SheetPullOptions) {
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const sheet = own.current;
    if (!body || !sheet) return;
    let pull: {
      startY: number;
      t: number;
      track: ReturnType<typeof follow> | null;
      // Whether this gesture scrolls the list itself (it claimed the touch), or the browser does.
      isOwned: boolean;
    } | null = null;

    const start = (e: TouchEvent) => {
      now.current.touched();
      if (now.current.snap !== 'full' || !docked() || e.touches.length !== 1) return;
      pull = { startY: e.touches[0].clientY, t: e.timeStamp, track: null, isOwned: false };
    };
    const move = (e: TouchEvent) => {
      if (!pull) return;
      const y = e.touches[0].clientY;
      if (!pull.track) {
        // The list scrolls until it is at its top and the finger goes on down: held from there.
        if (body.scrollTop > 0 || y < pull.startY) {
          pull.startY = y;
          pull.t = e.timeStamp;
          return;
        }
        // Down at the top there is nothing to scroll: claimed from the first move, so the browser
        // does not take it for its own scroll before the sheet takes hold.
        if (e.cancelable) e.preventDefault();
        if (y - pull.startY <= DRAG_PX / 3) return;
        const h = sheet.offsetHeight;
        const heights = now.current.heightsOf(h);
        // From where the finger is now, so the sheet does not jump to catch up with it.
        pull.track = follow(y, e.timeStamp, shownAt('full', h, heights), h, heights);
        pull.isOwned = e.cancelable;
        hold();
      }
      if (e.cancelable) e.preventDefault();
      show(pull.track.move(y, e.timeStamp));
      // Pulled back above where it took hold: the list scrolls under the finger, the sheet at full.
      if (pull.isOwned) body.scrollTop = pull.track.beyond(y);
    };
    const end = (e: TouchEvent) => {
      const track = pull?.track;
      const isOwned = !!pull?.isOwned;
      pull = null;
      if (track) now.current.throwTo(track, e.timeStamp, undefined, isOwned);
    };
    // A wheel moves the sheet only on a push its deltas add up past DRAG_PX, never a scroll's tail.
    let pushed = 0;
    let lastWheel = 0;
    let scrolledAt = -Infinity;
    const wheel = (e: WheelEvent) => {
      if (!docked()) return;
      if (e.timeStamp - lastWheel > 200) pushed = 0;
      lastWheel = e.timeStamp;
      const at = now.current.snap;
      if ((at === 'full' && body.scrollTop > 0) || e.timeStamp - scrolledAt < 300) {
        scrolledAt = e.timeStamp;
        pushed = 0;
        return;
      }
      pushed += e.deltaY;
      const h = sheet.offsetHeight;
      if (at !== 'low' && pushed < -DRAG_PX) {
        pushed = 0;
        now.current.settle(stepFrom(at, false, h, now.current.heightsOf(h)));
      } else if (at !== 'full' && at !== 'low' && pushed > DRAG_PX) {
        pushed = 0;
        now.current.settle(stepFrom(at, true, h, now.current.heightsOf(h)));
      }
    };
    const bound = new AbortController();
    const on = { signal: bound.signal };
    body.addEventListener('touchstart', start, { ...on, passive: true });
    body.addEventListener('touchmove', move, { ...on, passive: false });
    body.addEventListener('touchend', end, on);
    body.addEventListener('touchcancel', end, on);
    body.addEventListener('wheel', wheel, { ...on, passive: true });
    return () => bound.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bound once; what changes is read through `now`
  }, []);
}
