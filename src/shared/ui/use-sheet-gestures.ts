import {
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { holdShownUntilClick } from './hold-shown-handle';
import { raisesAtLow } from './raises-at-low';
import { glideTo } from './sheet-coast';
import {
  DRAG_PX,
  follow,
  heightsFor,
  shownAt,
  stepFrom,
  swallowTheTapsClick,
  type SheetHeights,
  type SheetShape,
  type Snap,
} from './sheet-gesture';
import { isReducedMotion, shownOnScreen, useSheetGlide } from './use-sheet-glide';

/** A sheet whose highest is its content's height (BottomSheet's `fits`), not the screen's. */
export interface FittedSheet {
  /** Its two ends for a map `h` tall: Low, and its content's height (fitHeightsFor). */
  heightsFor: (h: number) => SheetHeights;
}

interface SheetGesturesOptions {
  /** The sheet itself. */
  sheet: RefObject<HTMLDivElement | null>;
  /** The handle over the header. */
  handle: RefObject<HTMLButtonElement | null>;
  /** The header, fixed at the top. */
  head: RefObject<HTMLDivElement | null>;
  /** The body, scrolling under the header at full height. */
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
  /** Set for a fitted sheet, whose full height is its content's; null for every other. */
  fitted: FittedSheet | null;
  /** Its Low and full (BottomSheet's `shape`). */
  shape: SheetShape;
  /** False: a pull or a flick down from Low rests at Low, and only Escape (or the page) closes it. */
  closesOnPull: boolean;
}

interface SheetGestures {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** The body's onFocus rule: focus from the keyboard below full raises the sheet; a press's does not. */
  onBodyFocus: (e: ReactFocusEvent<HTMLDivElement>) => void;
  /** Where a tap on the handle takes the sheet from `from`: a pointer's and Enter's alike. */
  afterTap: (from: Snap) => Snap;
  /** Which way the next tap on the handle goes: up, or, from full until Low, down. */
  isStepUp: (from: Snap) => boolean;
}

/**
 * How a finger or a mouse moves BottomSheet: the drag on the handle or the header, the pull down
 * from the list's top at full height, and the wheel's deliberate push. The sheet writes the DOM
 * (`show`) and keeps `dragging`; this decides where it goes (sheetGesture, sheetCoast). Called
 * after the sheet's two dock-mark layout effects.
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
  fitted,
  shape,
  closesOnPull,
}: SheetGesturesOptions): SheetGestures {
  const landing = (next: Snap | 'close'): Snap | 'close' =>
    next === 'close' && !closesOnPull ? 'low' : next;
  const glide = useSheetGlide(own);
  const settle = (next: Snap | 'close', glideMs: number | null = null) => {
    glide(glideMs);
    setDragging(false);
    const at = landing(next);
    if (at === 'close') onClose();
    else setSnap(at);
  };
  /** The two ends of a sheet on a map `h` tall. */
  const heightsOf = (h: number): SheetHeights =>
    fitted ? fitted.heightsFor(h) : heightsFor(h, shape);
  /** A drag let go at `now`: where its momentum carries the sheet, and how long it glides (glideTo). */
  const throwTo = (track: ReturnType<typeof follow>, now: number, at?: number) => {
    const h = own.current?.offsetHeight ?? 0;
    const { shown, velocity, from } = track.lift(now, at);
    const { to, glideMs } = glideTo(shown, velocity, heightsOf(h), h, isReducedMotion(), from);
    settle(to, glideMs);
  };
  // The way the handle's steps go: up from Low, down from full, and on the way they went between.
  // State, not a ref: the handle's label says which way the next step goes.
  const [isGoingUp, setGoingUp] = useState(true);
  const isStepUp = (from: Snap): boolean =>
    from === 'low' ? true : from === 'full' ? false : isGoingUp;
  /** Where a tap on the handle goes: a third of the map up or down (stepFrom). */
  const afterTap = (from: Snap): Snap => {
    const h = own.current?.offsetHeight ?? 0;
    const up = isStepUp(from);
    const next = stepFrom(from, up, h, heightsOf(h));
    setGoingUp(next === 'full' ? false : next === 'low' ? true : up);
    return next;
  };
  // Read by the listeners bound once below, written as each render commits, before a finger comes.
  const now = useRef({ snap, settle, throwTo, heightsOf, afterTap });
  useLayoutEffect(() => {
    now.current = { snap, settle, throwTo, heightsOf, afterTap };
  });

  // When a finger or a mouse last pressed: focus that follows a press is not the keyboard's.
  const lastPress = useRef(-Infinity);

  // A drag under way, let go of if the sheet closes before the finger lifts.
  const drag = useRef<AbortController | null>(null);
  useLayoutEffect(() => () => drag.current?.abort(), []);

  // At full height, the pull down from the list's top: touch events, as the browser takes a scroll
  // and cancels the pointer, but a non-passive touchmove can still be claimed. A wheel's deliberate
  // push steps the sheet a third, as a tap on the handle does, never raising it from Low.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    const sheet = own.current;
    if (!body || !sheet) return;
    let pull: { startY: number; t: number; track: ReturnType<typeof follow> | null } | null = null;

    const start = (e: TouchEvent) => {
      if (now.current.snap !== 'full' || !docked() || e.touches.length !== 1) return;
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
        const heights = now.current.heightsOf(h);
        pull.track = follow(pull.startY, pull.t, shownAt('full', h, heights), h, heights);
        setDragging(true);
      }
      e.preventDefault();
      show(pull.track.move(y, e.timeStamp));
    };
    const end = (e: TouchEvent) => {
      const track = pull?.track;
      pull = null;
      if (track) now.current.throwTo(track, e.timeStamp);
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

  // A drag and a tap are one gesture until DRAG_PX. Taps on what the sheet holds are its own; the
  // click after a drag, or a tap on the handle, is swallowed (sheetGesture).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    lastPress.current = e.timeStamp;
    holdShownUntilClick(handleRef.current);
    const sheet = own.current;
    const handle = handleRef.current;
    // One pointer at a time, a mouse's main button only, and docked only.
    if (drag.current || e.button !== 0 || !sheet || !handle || !docked()) return;
    const target = e.target instanceof Node ? e.target : null;
    // At full height the body scrolls as a list does; the header brings the sheet down.
    if (snap === 'full' && !headRef.current?.contains(target) && !handle.contains(target)) return;
    const raises =
      handle.contains(target) || (snap === 'low' && raisesAtLow(bodyRef.current, target));
    const h = sheet.offsetHeight;
    const heights = heightsOf(h);
    const track = follow(e.clientY, e.timeStamp, shownOnScreen(sheet), h, heights);
    let moving = false;

    // Followed on the window: a finger dragged above the sheet is over the map, out of its hearing.
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
      if (moving) now.current.throwTo(track, ev.timeStamp, ev.clientY);
      else if (raises) now.current.settle(now.current.afterTap(snap));
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

  // Focus from the keyboard below full lands on rows that may be below the screen: the sheet rises
  // to full, where the list scrolls them into view. A press's focus leaves the sheet where it is.
  const onBodyFocus = (e: ReactFocusEvent<HTMLDivElement>) => {
    const fromKeys = e.timeStamp - lastPress.current > 800 && e.target.matches(':focus-visible');
    if (snap !== 'full' && fromKeys && docked()) setSnap('full');
  };

  return { onPointerDown, onBodyFocus, afterTap, isStepUp };
}
