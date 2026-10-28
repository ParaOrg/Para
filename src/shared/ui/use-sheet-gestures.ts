import {
  useLayoutEffect,
  useRef,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import {
  DRAG_PX,
  aboveMiddle,
  follow,
  shownAt,
  snapAfterTap,
  swallowTheTapsClick,
  type Snap,
} from './sheet-gesture';

interface SheetGesturesOptions {
  /** The sheet itself. */
  sheet: RefObject<HTMLDivElement | null>;
  /** The handle over the header. */
  handle: RefObject<HTMLButtonElement | null>;
  /** The header, fixed at the top. */
  head: RefObject<HTMLDivElement | null>;
  /** The body, scrolling under the header at Max. */
  body: RefObject<HTMLDivElement | null>;
  snap: Snap;
  setSnap: (snap: Snap) => void;
  onClose: () => void;
  /** The component's `dragging`: on while a finger or a mouse has the sheet. */
  setDragging: (dragging: boolean) => void;
  /** Writes --sheet-y (and --dock-y) for `shown` px on show: the component's `show`. */
  show: (shown: number) => void;
  /** Docked, not floating. */
  docked: () => boolean;
}

interface SheetGestures {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** The body's onFocus rule: focus from the keyboard below Max raises the sheet; a press's does not. */
  onBodyFocus: (e: ReactFocusEvent<HTMLDivElement>) => void;
}

/**
 * How a finger or a mouse moves BottomSheet: the drag on the handle or the
 * header, the pull down from the list's top at Max, and the wheel's
 * deliberate push. The sheet writes the DOM (`show`) and keeps `dragging`;
 * this decides where it goes (sheetGesture). Called after the sheet's two
 * dock-mark layout effects.
 */
export function useSheetGestures({
  sheet: own,
  handle: handleRef,
  head: headRef,
  body: bodyRef,
  snap,
  setSnap,
  onClose,
  setDragging,
  show,
  docked,
}: SheetGesturesOptions): SheetGestures {
  const settle = (next: Snap | 'close') => {
    setDragging(false);
    if (next === 'close') onClose();
    else setSnap(next);
  };
  // Read by the listeners bound once below: today's snap and settle,
  // written as the render commits, before a finger or a wheel can come.
  const now = useRef({ snap, settle });
  useLayoutEffect(() => {
    now.current = { snap, settle };
  });

  // When a finger or a mouse last pressed on the sheet: focus that follows a
  // press is the press's, not the keyboard's (the body's onFocus).
  const lastPress = useRef(-Infinity);

  // A drag under way, let go of if the sheet closes before the finger lifts.
  const drag = useRef<AbortController | null>(null);
  useLayoutEffect(() => () => drag.current?.abort(), []);

  // At Max, the pull down from the list's top. Touch events, not pointer
  // ones: the browser takes a scroll for itself and cancels the pointer, but
  // a non-passive touchmove can still be claimed. A wheel does the same at
  // the top of the list, and turned the other way at Middle raises the sheet.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const sheet = own.current;
    if (!body || !sheet) return;
    let pull: { startY: number; t: number; track: ReturnType<typeof follow> | null } | null = null;

    const start = (e: TouchEvent) => {
      if (now.current.snap !== 'max' || !docked() || e.touches.length !== 1) return;
      pull = { startY: e.touches[0].clientY, t: e.timeStamp, track: null };
    };
    const move = (e: TouchEvent) => {
      if (!pull) return;
      const y = e.touches[0].clientY;
      if (!pull.track) {
        // Only a pull down from the very top of the list; anything else scrolls.
        if (body.scrollTop > 0 || y < pull.startY) {
          pull = null;
          return;
        }
        if (y - pull.startY <= DRAG_PX / 3) return;
        const h = sheet.offsetHeight;
        pull.track = follow(pull.startY, pull.t, shownAt('max', h), h);
        setDragging(true);
      }
      e.preventDefault();
      show(pull.track.move(y, e.timeStamp));
    };
    const end = (e: TouchEvent) => {
      const track = pull?.track;
      pull = null;
      if (track) now.current.settle(track.release(e.timeStamp));
    };
    // A wheel moves the sheet only on a deliberate push: its deltas are added
    // up and act past DRAG_PX, and never inside a scroll's tail, however long
    // a trackpad's momentum lasts — reaching the top is not a pull down.
    let pushed = 0;
    let lastWheel = 0;
    let scrolledAt = -Infinity;
    const wheel = (e: WheelEvent) => {
      if (!docked()) return;
      if (e.timeStamp - lastWheel > 200) pushed = 0;
      lastWheel = e.timeStamp;
      const at = now.current.snap;
      if ((at === 'max' && body.scrollTop > 0) || e.timeStamp - scrolledAt < 300) {
        scrolledAt = e.timeStamp;
        pushed = 0;
        return;
      }
      pushed += e.deltaY;
      if (aboveMiddle(at) && pushed < -DRAG_PX) {
        pushed = 0;
        now.current.settle('middle');
      } else if (at !== 'max' && at !== 'low' && pushed > DRAG_PX) {
        pushed = 0;
        now.current.settle('max');
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

  // A drag and a tap are one gesture until it has travelled DRAG_PX. Taps on
  // what the sheet holds are left to it; the click after a drag, or after a
  // tap on the handle, is swallowed (sheetGesture).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    lastPress.current = e.timeStamp;
    const sheet = own.current;
    const handle = handleRef.current;
    // One pointer at a time, a mouse's main button only, and docked only.
    if (drag.current || e.button !== 0 || !sheet || !handle || !docked()) return;
    const target = e.target instanceof Node ? e.target : null;
    // At Max the body scrolls as a list does; the header brings the sheet down.
    if (snap === 'max' && !headRef.current?.contains(target) && !handle.contains(target)) return;
    // At Low the top of the body is not for picking: a tap there raises the
    // sheet, as one on the handle does.
    const raises =
      handle.contains(target) || (snap === 'low' && !!bodyRef.current?.contains(target));
    const h = sheet.offsetHeight;
    const track = follow(e.clientY, e.timeStamp, shownAt(snap, h), h);
    let moving = false;

    // Followed on the window, not the sheet: a finger or a mouse dragged
    // above the sheet is over the map, and the sheet would stop hearing it.
    // Not captured, so a tap on what the sheet holds stays that thing's.
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!moving) {
        if (Math.abs(e.clientY - ev.clientY) <= DRAG_PX) return;
        moving = true;
        setDragging(true);
      }
      show(track.move(ev.clientY, ev.timeStamp));
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      hotspot();
      if (moving || raises) swallowTheTapsClick(ev.clientX, ev.clientY);
      if (moving) now.current.settle(track.release(ev.timeStamp, ev.clientY));
      else if (raises) now.current.settle(snapAfterTap(snap));
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      hotspot();
      setDragging(false);
    };
    const hotspot = () => {
      drag.current?.abort();
      drag.current = null;
    };
    drag.current = new AbortController();
    const on = { signal: drag.current.signal };
    window.addEventListener('pointermove', move, on);
    window.addEventListener('pointerup', up, on);
    window.addEventListener('pointercancel', cancel, on);
  };

  // Focus from the keyboard below Max lands on rows that may be below the
  // screen: the sheet rises to Max, where the list scrolls them into view.
  // Focus that follows a press is the press's own and leaves the sheet where
  // it is.
  const onBodyFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    const fromKeys = e.timeStamp - lastPress.current > 800 && e.target.matches(':focus-visible');
    if (snap !== 'max' && fromKeys && docked()) setSnap('max');
  };

  return { onPointerDown, onBodyFocus };
}
