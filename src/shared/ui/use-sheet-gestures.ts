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
import { glideTo, listCoast } from './sheet-coast';
import {
  DRAG_PX,
  follow,
  heightsFor,
  snapFor,
  stepFrom,
  swallowTheTapsClick,
  type SheetHeights,
  type SheetShape,
  type Snap,
} from './sheet-gesture';
import { isReducedMotion, shownOnScreen } from './use-sheet-glide';
import { useSheetPull, type SheetNow } from './use-sheet-pull';
import { useSheetRelease } from './use-sheet-release';

/** How far down a list scrolled `room` more can still go: what a throw up carries into. */
function roomBelow(body: HTMLElement): number {
  return Math.max(0, body.scrollHeight - body.clientHeight - body.scrollTop);
}

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
  /** Writes them for the sheet at rest at `snap`, as its next render will: the component's `rest`. */
  rest: (snap: Snap) => void;
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
 * from the list's top at full height (useSheetPull), and the wheel's deliberate push. The sheet
 * writes the DOM (`show`, `rest`) and keeps `dragging`; this decides where it goes (sheetGesture,
 * sheetCoast). Let go, the sheet starts its glide at once and renders its new height a frame
 * later, so the page's work for that height never holds the glide's first frames. A finger on a
 * gliding sheet stops it where it is. Called after the sheet's two dock-mark layout effects.
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
  rest,
  docked,
  fitted,
  shape,
  closesOnPull,
}: SheetGesturesOptions): SheetGestures {
  const { glider, hold, settle, touched } = useSheetRelease({
    sheet: own,
    body: bodyRef,
    setSnap,
    onClose,
    setDragging,
    rest,
    closesOnPull,
  });
  /** The two ends of a sheet on a map `h` tall. */
  const heightsOf = (h: number): SheetHeights =>
    fitted ? fitted.heightsFor(h) : heightsFor(h, shape);
  /**
   * A drag let go at `now`: where its momentum carries the sheet, and the list after (glideTo). A
   * drag that scrolled the list past full (`isListDriven`) leaves the list to coast on alone.
   */
  const throwTo = (
    track: ReturnType<typeof follow>,
    now: number,
    at?: number,
    isListDriven = false,
  ) => {
    const h = own.current?.offsetHeight ?? 0;
    const body = bodyRef.current;
    const { shown, velocity, from } = track.lift(now, at);
    const isReduced = isReducedMotion();
    if (isListDriven && body && body.scrollTop > 0 && track.beyond(at) > 0) {
      const coast = isReduced ? null : listCoast(velocity, body.scrollTop, roomBelow(body));
      settle('full', null, coast && { afterMs: 0, ...coast });
      return;
    }
    // Where the browser scrolled the list itself, its own fling carries on: no coast drawn over it.
    const room = body && isListDriven ? roomBelow(body) : 0;
    const out = glideTo(shown, velocity, heightsOf(h), h, isReduced, from, room);
    settle(out.to, out.glide, out.list);
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
  // Read by the listeners bound once, written as each render commits, before a finger comes.
  const now = useRef<SheetNow & { afterTap: typeof afterTap }>({
    snap,
    settle,
    throwTo,
    heightsOf,
    touched,
    afterTap,
  });
  useLayoutEffect(() => {
    now.current = { snap, settle, throwTo, heightsOf, touched, afterTap };
  });

  // When a finger or a mouse last pressed: focus that follows a press is not the keyboard's.
  const lastPress = useRef(-Infinity);

  // A drag under way, let go of if the sheet closes before the finger lifts.
  const drag = useRef<AbortController | null>(null);
  useLayoutEffect(() => () => drag.current?.abort(), []);

  useSheetPull({ sheet: own, body: bodyRef, now, docked, hold, show });

  // A drag and a tap are one gesture until DRAG_PX. Taps on what the sheet holds are its own; the
  // click after a drag, a tap on the handle, or a tap that stopped a glide, is swallowed.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    lastPress.current = e.timeStamp;
    holdShownUntilClick(handleRef.current);
    const at = touched() ?? snap;
    const sheet = own.current;
    const handle = handleRef.current;
    // One pointer at a time, a mouse's main button only, and docked only.
    if (drag.current || e.button !== 0 || !sheet || !handle || !docked()) return;
    const target = e.target instanceof Node ? e.target : null;
    const raises =
      handle.contains(target) || (at === 'low' && raisesAtLow(bodyRef.current, target));
    // Caught mid-glide, it stops where it is, as a list does under a finger. A tap that steps it
    // (the handle, or the body at Low) steps it on from where it is going instead.
    const isCaught = !raises && glider.isCoasting();
    // At full height the body scrolls as a list does; the header brings the sheet down.
    const isOnList = !headRef.current?.contains(target) && !handle.contains(target);
    if (at === 'full' && isOnList && !isCaught) return;
    const h = sheet.offsetHeight;
    const heights = heightsOf(h);
    const shown = shownOnScreen(sheet, heights.full);
    if (isCaught) {
      glider.clear();
      hold();
      show(shown);
    }
    const scrolledFrom = bodyRef.current?.scrollTop ?? 0;
    let track: ReturnType<typeof follow> | null = null;

    // Followed on the window: a finger dragged above the sheet is over the map, out of its hearing.
    // Not captured, so a tap on what the sheet holds stays that thing's.
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!track) {
        if (Math.abs(e.clientY - ev.clientY) <= DRAG_PX) return;
        // Followed from DRAG_PX along the finger's way, so the sheet does not jump to catch up
        // with it; the finger's own first sample, so its speed is read from where it really was.
        const tookHold = e.clientY + Math.sign(ev.clientY - e.clientY) * DRAG_PX;
        track = follow(ev.clientY, ev.timeStamp, shown + tookHold - ev.clientY, h, heights);
        hold();
      }
      show(track.move(ev.clientY, ev.timeStamp));
      // Raised past full in the same gesture, the list scrolls under the finger.
      const body = bodyRef.current;
      if (body && (track.beyond() > 0 || body.scrollTop !== scrolledFrom))
        body.scrollTop = scrolledFrom + track.beyond();
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      hotspot();
      if (track || raises || isCaught) swallowTheTapsClick(ev.clientX, ev.clientY);
      if (track) now.current.throwTo(track, ev.timeStamp, ev.clientY, true);
      else if (raises) now.current.settle(now.current.afterTap(at));
      else if (isCaught) now.current.settle(snapFor(shown, 0, heights, h));
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      hotspot();
      if (track || isCaught)
        now.current.settle(snapFor(shownOnScreen(sheet, heights.full), 0, heights, h));
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
