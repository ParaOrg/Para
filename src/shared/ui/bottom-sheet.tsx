import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';

import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';

import {
  MAX_STRIP_PX,
  measureSafeTop,
  slide,
  slideShowing,
  snapAfterTap,
  snapName,
  type Snap,
  type SnapName,
} from './sheet-gesture';
import { useSheetGestures } from './use-sheet-gestures';

interface Props {
  /** What a screen reader calls it: the list by its count, a trip by its direction, a card by its place. */
  label: string;
  /** The suites find the list as `chooser`, and every other card as `card`. */
  testId: 'chooser' | 'card';
  /** Fixed at the top; everything else scrolls under it. */
  header: ReactNode;
  /** Escape does what ✕ does. */
  onClose: () => void;
  /**
   * Kept, but not shown: the route list, while a trip it opened is on top, so
   * that ‹ finds it as it was left — scrolled where it was, in the same
   * colours. Escape is the trip's then, not the list's.
   */
  hidden?: boolean;
  /** The sheet itself, for the map to keep what it glides to clear of it (clearOfDock). */
  ref?: Ref<HTMLDivElement>;
  /**
   * What it is on a wide screen, where it stops being a sheet: the route
   * list's, a trip's and a place's (the public map's HintuanCard) panel in
   * the top-left corner from `@float:` (`corner`, the default), or the card
   * the studio's hotspot and route cards float as, 16 in, from `@wide:`
   * (`card`). What it holds reads which with `sheet-floating:` and
   * `sheet-low:` (index.css).
   */
  floats?: 'corner' | 'card';
  /**
   * The height, when the caller keeps it: sheets that stand in for one
   * another — the route list, a hotspot's card and the trip opened from
   * them — share one, so ‹ and a pick keep Low, Middle or Max as they were.
   * Without it, the sheet keeps its own.
   */
  height?: SheetHeight;
  children: ReactNode;
}

/** A sheet's height kept by its caller (BottomSheet's `height`). */
export interface SheetHeight {
  snap: Snap;
  onSnap: (snap: Snap) => void;
}

/**
 * Where each kind floats, and how wide; in each kind's own variant, so its
 * `inset-auto` comes before its `top` and `left`. The rest is `sheet-floating:`.
 */
const FLOATS_AT = {
  corner:
    '@float:inset-auto @float:top-0 @float:left-0 @float:max-h-full @float:w-96 @float:pt-0 @float:pb-0',
  card:
    '@wide:inset-auto @wide:top-4 @wide:left-4 @wide:w-80 @wide:max-w-[calc(100%-2rem)] @wide:max-h-[calc(100%-2rem)] ' +
    '@wide:rounded-xl @wide:shadow-xl @wide:ring-1 @wide:ring-black/10 @wide:pt-4 @wide:pb-4',
};

/**
 * Every card on the map is this one sheet, by the owner's rule: the route
 * list, a trip's card, a hotspot's card and the studio's route card alike.
 * Only what it floats as on a wide screen differs (`floats`): the list and a
 * trip flush in the top-left corner, 384 wide (Figma 3750:1911), the body
 * scrolling under the header with no scrollbar drawn, the owner's pick.
 *
 * On a phone it is BottomSheetConfiguration (Figma 3815:5637), square along
 * the top: a HandleNotch over the header, and three heights (sheetGesture) —
 * Low, the header and the top of the first card, a tap on it raising the
 * sheet; Middle, where it opens; Max, the whole map, clear of a phone's
 * notch. It is always the whole map tall and slides (`--sheet-y`), so moving
 * between heights is one smooth `translate`: a drag on the handle or the
 * header follows the finger and, let go slowly, glides to the nearest height;
 * flicked, it goes to the end its way, Max or Low, as Google's and Apple's
 * maps do; flicked down from Low, it closes. Below Max the body does not
 * scroll: a swipe on it moves the sheet; at Max it scrolls, and a pull down
 * from its top takes hold of the sheet — to Middle held slowly, to Low
 * flicked. A tap on the handle goes round, Low → Middle → Max. Between Middle
 * and Max it stays where it is let go, the owner's pick (sheetGesture's
 * snapFor), its body still.
 *
 * Its siblings: sheet-gesture.ts decides the heights and the drags, and
 * measures the status bar; use-sheet-gestures.ts binds the finger, the mouse
 * and the wheel; sheet-header.tsx is the header with ✕ a card may bring;
 * sheet-room.ts is the room the sheet leaves the camera.
 */
export function BottomSheet({
  label,
  testId,
  header,
  onClose,
  hidden = false,
  ref,
  floats = 'corner',
  height,
  children,
}: Props) {
  const own = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [ownSnap, setOwnSnap] = useState<Snap>('middle');
  const snap = height?.snap ?? ownSnap;
  const setSnap = height?.onSnap ?? setOwnSnap;
  // A finger on it: the glide is off, and --sheet-y is the drag's, written
  // straight onto the sheet move by move rather than rendered.
  const [dragging, setDragging] = useState(false);
  // Where it first stands, drawn with it: a card opening over another (a
  // place's name tapped) is new, and without this it would show at Max for a
  // moment and glide down to its height. Never changed after, so React
  // leaves the drag's and the glide's --sheet-y alone.
  measureSafeTop();
  const [opensAt] = useState(() => ({ '--sheet-y': slide(snap) }) as CSSProperties);
  useDialogFocus(own, hidden);
  useEscape(onClose, !hidden);

  /**
   * Where the sheet slides to. The page's `[data-dock-host]` hears it too, as
   * `--dock-y`, while this is the sheet on show: what sits on the map above
   * the sheet follows it (ScreenLocationBehavior, Figma 3870:5941). The same
   * length, so both glide alike.
   */
  function at(y: string) {
    const sheet = own.current;
    if (!sheet) return;
    sheet.style.setProperty('--sheet-y', y);
    if (!sheet.hidden)
      sheet.closest<HTMLElement>('[data-dock-host]')?.style.setProperty('--dock-y', y);
  }

  // Whether this sheet put the mark on the page: only it takes it off, so a
  // hidden sheet's change, or one unmounting, leaves another's drag alone.
  const markedRef = useRef(false);
  useLayoutEffect(() => {
    if (!dragging) at(slide(snap));
    // What follows the sheet on the page (the LocatorButton) glides with it,
    // or keeps up with the finger.
    const mark = dragging && !hidden;
    if (mark === markedRef.current) return;
    own.current?.closest('[data-dock-host]')?.toggleAttribute('data-dock-dragging', mark);
    markedRef.current = mark;
  }, [snap, dragging, hidden]);
  // A flick that closes the sheet unmounts it mid-drag, before the effect
  // above runs with the drag over, and the page would keep the attribute: the
  // LocatorButton would stop gliding for good. The host is held from the
  // mount, as the sheet is gone from it by the cleanup.
  useLayoutEffect(() => {
    const host = own.current?.closest('[data-dock-host]');
    return () => {
      if (markedRef.current) host?.removeAttribute('data-dock-dragging');
    };
  }, []);

  /** Docked, not floating: the notch is drawn only then. */
  const docked = () => handleRef.current?.offsetParent != null;
  const show = (shown: number) => at(slideShowing(shown));
  const { onPointerDown, onBodyFocus } = useSheetGestures({
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
  });

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      own.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  return (
    <div
      ref={setRefs}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
      data-testid={testId}
      data-snap={snapName(snap)}
      data-floats={floats}
      hidden={hidden}
      style={opensAt}
      onPointerDown={onPointerDown}
      className={
        // Docked, it casts BottomSheet/TopShadow (3817:6007) up onto the map;
        // floating as a card, its own shadow-xl takes over.
        'absolute inset-0 z-10 flex flex-col overflow-clip bg-surface shadow-bottom-sheet-top-shadow outline-none ' +
        'pb-[env(safe-area-inset-bottom)] ' +
        'translate-y-(--sheet-y) motion-reduce:transition-none ' +
        (dragging ? '' : 'transition-[translate] duration-sheet ease-enter ') +
        'sheet-floating:translate-y-0 sheet-floating:transition-none ' +
        FLOATS_AT[floats]
      }
    >
      {/*
        HandleNotch (3813:2963), 22 tall as drawn. It is not the only place to
        take hold: the header under it drags the sheet too, some 80 together.
        `touch-none`, or the browser takes the pull for a scroll.
      */}
      <button
        ref={handleRef}
        type="button"
        data-testid="dock-handle"
        aria-label={HANDLE_LABEL[snapName(snap)]}
        title={HANDLE_LABEL[snapName(snap)]}
        onClick={() => setSnap(snapAfterTap(snap))}
        // HandleNotch: 8 above the bar, 4 below (Figma 3742:1049).
        className="flex w-full shrink-0 touch-none justify-center pt-2 pb-1 sheet-floating:hidden"
      >
        <span aria-hidden className="h-1.5 w-12 rounded-full bg-surface-quaternary" />
      </button>
      <div ref={headRef} className="shrink-0 touch-none sheet-floating:touch-auto">
        {header}
      </div>
      <div
        ref={bodyRef}
        onFocus={onBodyFocus}
        className={
          'min-h-0 flex-1 scrollbar-none sheet-floating:touch-auto sheet-floating:overflow-y-auto [&::-webkit-scrollbar]:hidden ' +
          (snap === 'max' ? 'overflow-y-auto' : 'touch-none overflow-hidden')
        }
        // At Max the sheet stands a gap down the map (sheetGesture), as much
        // of it under the screen's bottom: padded by that, its list scrolls to the end.
        style={
          snap === 'max'
            ? { paddingBottom: 'calc(env(safe-area-inset-top) + ' + MAX_STRIP_PX + 'px)' }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}

/**
 * What a screen reader hears on the handle: the height the sheet is at, and
 * what Enter does.
 */
const HANDLE_LABEL = {
  low: 'Sheet lowered. Raise to half the screen',
  middle: 'Sheet at half the screen. Raise to full screen',
  max: 'Sheet at full screen. Lower it',
  free: 'Sheet raised past half the screen. Raise to full screen',
} satisfies Record<SnapName, string>;
