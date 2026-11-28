import { useEffect, useRef, type RefObject } from 'react';

import type { Glide, ListCoast } from './sheet-coast';
import type { Snap } from './sheet-gesture';
import { useListCoast } from './use-list-coast';
import { useSheetGlide } from './use-sheet-glide';

interface SheetReleaseOptions {
  sheet: RefObject<HTMLDivElement | null>;
  body: RefObject<HTMLDivElement | null>;
  setSnap: (snap: Snap) => void;
  onClose: () => void;
  /** The component's `dragging`: on while a finger or a mouse has the sheet. */
  setDragging: (dragging: boolean) => void;
  /** Writes the sheet's position at rest at `snap`, as its next render will. */
  rest: (snap: Snap) => void;
  /** False: a pull down that would close it rests it at Low. */
  closesOnPull: boolean;
}

/**
 * How a sheet a finger held is let go. `settle` starts its glide at once, on the sheet itself
 * (`rest`), and renders its new height two frames later: what the page does for that height
 * (data-snap, the cards, the camera) then never holds the glide's first frames, which a phone
 * shows as the sheet stopping as the finger lifts. A list coast carried on from a throw starts
 * with it. A sheet nobody held (a tap, a key, a wheel) renders at once. `touched` lands what is
 * still owed and stops the list's coast, as a finger comes down, and says where the sheet is going.
 */
export function useSheetRelease({
  sheet,
  body,
  setSnap,
  onClose,
  setDragging,
  rest,
  closesOnPull,
}: SheetReleaseOptions) {
  const glider = useSheetGlide(sheet);
  const list = useListCoast(body);
  const isHeld = useRef(false);
  const owed = useRef<{ to: Snap | 'close'; commit: () => void } | null>(null);
  const frame = useRef<number | null>(null);
  // Unmounted before it renders, a let-go sheet owes nothing: the next sheet's height is its own.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      owed.current = null;
    },
    [],
  );
  /** Renders what a let-go sheet still owes, now: the height it is gliding to, or null. */
  const payOwed = (): Snap | null => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const pay = owed.current;
    owed.current = null;
    pay?.commit();
    return pay && pay.to !== 'close' ? pay.to : null;
  };
  const hold = () => {
    isHeld.current = true;
    setDragging(true);
  };
  const settle = (
    next: Snap | 'close',
    glide: Glide | null = null,
    coast: ListCoast | null = null,
  ) => {
    payOwed();
    const at = next === 'close' && !closesOnPull ? 'low' : next;
    const wasHeld = isHeld.current;
    isHeld.current = false;
    const commit = () => {
      setDragging(false);
      if (at === 'close') onClose();
      else setSnap(at);
    };
    glider.glide(glide);
    if (at === 'close' || !wasHeld) {
      commit();
      return;
    }
    rest(at);
    if (coast) list.run(coast);
    owed.current = { to: at, commit };
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(payOwed);
    });
  };
  const touched = (): Snap | null => {
    list.stop();
    return payOwed();
  };
  return { glider, hold, settle, touched };
}
