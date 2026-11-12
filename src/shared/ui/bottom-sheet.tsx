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
import { cn } from '@/shared/utils/cn';

import {
  CARD_SHAPE,
  MAX_STRIP_PX,
  fitHeightsFor,
  measureSafeTop,
  shownAt,
  slide,
  slideShowing,
  snapName,
  type SheetShape,
  type Snap,
} from './sheet-gesture';
import { useSheetGestures, type FittedSheet } from './use-sheet-gestures';

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
   * the studio's hotspot card floats as, 16 in, from `@wide:` (`card`). What it
   * holds reads which with `sheet-floating:` and `sheet-low:` (global.css). `dock`: the route
   * list's, docked the map's whole height on the left from `@float:`, 384 wide (Figma 4683:32635),
   * its `footer` its top bar.
   */
  floats?: 'corner' | 'card' | 'dock';
  /**
   * The height, when the caller keeps it: sheets that stand in for one
   * another — the route list, a hotspot's card and the trip opened from
   * them — share one, so ‹ and a pick keep the height as it was.
   * Without it, the sheet keeps its own.
   */
  height?: SheetHeight;
  /**
   * Its highest is its content's height, never above full height (where the content scrolls): it
   * moves freely between Low and there. For a card whose content is short and known, as a
   * contributor's ride is (Figma 4560:12422): the map stays in sight above it. Off for every other
   * card.
   */
  fits?: boolean;
  /**
   * Off: a pull or a flick down from Low leaves it at Low, and only Escape or the page's own way
   * back closes it. For a card that is a screen of its own, as a contributor's ride is, where
   * closing means leaving it. On for every other card: down from Low, it closes.
   */
  closesOnPull?: boolean;
  /**
   * Its own Low and full height, where they differ from every card's: the route list's Low shows
   * its first card above its Controller, and its full height fills the screen (Figma 4633:25575).
   * Every other card's by default (CARD_SHAPE).
   */
  shape?: SheetShape;
  /**
   * `hidden`: no HandleNotch drawn, where Figma draws none (the route list), but the button stays
   * for the keyboard and a screen reader: Tab reaches it, it says the height and moves it, and it
   * shows as the notch while it has the keyboard's focus.
   */
  handle?: 'shown' | 'hidden';
  /**
   * At the sheet's foot on the screen at any height, a list's or a trip's Controller, the body under
   * it (4679:23737), letting taps through but for its buttons; floating, the sheet's top bar
   * (4683:32635). Read before the body; the sheet says it has one (`data-footer`).
   */
  footer?: ReactNode;
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
 * `corner` and `dock` start `--sheet-float-top` down, 0 unless the page sets it:
 * the public map sets it under its place search, once per layout, never per move.
 */
const FLOATS_AT = {
  corner:
    '@float:inset-auto @float:top-[var(--sheet-float-top,0px)] @float:left-0 @float:max-h-[calc(100%-var(--sheet-float-top,0px))] @float:w-96 @float:pt-0 @float:pb-0',
  dock: '@float:inset-auto @float:top-[var(--sheet-float-top,0px)] @float:bottom-0 @float:left-0 @float:w-96 @float:overflow-visible @float:pt-0 @float:pb-0',
  card:
    '@wide:inset-auto @wide:top-4 @wide:left-4 @wide:w-80 @wide:max-w-[calc(100%-2rem)] @wide:max-h-[calc(100%-2rem)] ' +
    '@wide:rounded-xl @wide:shadow-xl @wide:ring-1 @wide:ring-black/10 @wide:pt-4 @wide:pb-4',
};

/**
 * Every card on the map is this one sheet, by the owner's rule: the route
 * list, a trip's card, a place's card (HintuanCard) and the studio's hotspot
 * card alike. Only what it floats as on a wide screen differs (`floats`): the
 * list, a trip and a place flush in the top-left corner, 384 wide (Figma
 * 3750:1911), the body scrolling under the header with no scrollbar drawn,
 * the owner's pick.
 *
 * On a phone it is BottomSheetConfiguration (Figma 3815:5637), square along
 * the top: a HandleNotch over the header. It opens at Low, the header and the
 * top of the first card, and moves freely from there to full height, which
 * leaves only a strip of map (MAX_STRIP_PX), clear of a phone's notch: the
 * owner's rule. It is always the whole map tall and slides (`--sheet-y`), so
 * moving is one smooth `translate`: a drag on the handle or the header follows
 * the finger and, let go, stays where it is; only Low keeps a magnet, let go
 * near it or flicked down from anywhere (sheetGesture's snapFor). Pulled
 * below half of Low, or flicked down from it, the sheet closes. Below full
 * height the body does not scroll: a swipe on it moves the sheet, the owner's
 * pick; at full it scrolls, and a pull down from its top takes hold of the
 * sheet, as a drag does. A tap on the handle or Enter on it steps a third of
 * the map, up from Low and down from full (stepFrom); a wheel's push steps the
 * same between them, but never raises a sheet from Low.
 *
 * Its siblings: sheet-gesture.ts decides the heights and the drags, and
 * measures the status bar; use-sheet-gestures.ts binds the finger, the mouse
 * and the wheel; sheet-header.tsx is the header with ✕ a card may bring;
 * sheet-room.ts is the room the sheet leaves the camera.
 *
 * A page that builds its own Tailwind with source(none) must @source this file: its
 * classes are not seen otherwise (contribute.css does).
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
  fits = false,
  closesOnPull = true,
  shape = CARD_SHAPE,
  handle = 'shown',
  footer,
  children,
}: Props) {
  const own = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [ownSnap, setOwnSnap] = useState<Snap>('low');
  const setSnap = height?.onSnap ?? setOwnSnap;
  // A fitted sheet's measure: the map's height, and its handle, header and content's together.
  const [fit, setFit] = useState<{ mapPx: number; contentPx: number } | null>(null);
  useLayoutEffect(() => {
    const sheet = own.current;
    const content = contentRef.current;
    if (!fits || !sheet || !content) return;
    const measure = () =>
      setFit({
        mapPx: sheet.offsetHeight,
        contentPx:
          (handleRef.current?.offsetHeight ?? 0) +
          (headRef.current?.offsetHeight ?? 0) +
          content.offsetHeight,
      });
    measure();
    const observer = new ResizeObserver(measure);
    for (const el of [sheet, headRef.current, content]) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [fits]);
  const fitted: FittedSheet | null =
    fits && fit ? { heightsFor: (h) => fitHeightsFor(h, fit.contentPx) } : null;
  const snap = height?.snap ?? ownSnap;
  /**
   * Where the sheet rests at `to`: a CSS length that follows the map's size, or, for a fitted
   * sheet, its content's height measured, which no CSS length knows.
   */
  const restAt = (to: Snap): string =>
    fitted && fit
      ? slideShowing(shownAt(to, fit.mapPx, fitted.heightsFor(fit.mapPx)), shape)
      : slide(to, shape);
  // A finger on it: the glide is off, and --sheet-y is the drag's, written
  // straight onto the sheet move by move rather than rendered.
  const [dragging, setDragging] = useState(false);
  // The status bar's height as this sheet sees it, before anything asks for full height.
  useLayoutEffect(() => measureSafeTop(own.current), []);
  // Where it first stands, drawn with it: a card opening over another (a
  // place's name tapped) is new, and without this it would show at full height
  // for a moment and glide down to its height. Never changed after, so React
  // leaves the drag's and the glide's --sheet-y alone.
  const [opensAt] = useState(() => ({ '--sheet-y': slide(snap, shape) }) as CSSProperties);
  useDialogFocus(own, hidden);
  // A sheet left open under an inert page (the studio's other maps) is out of reach, Escape too.
  useEscape(() => {
    if (!own.current?.closest('[inert]')) onClose();
  }, !hidden);

  /**
   * Where the sheet slides to. What sits on the map above the sheet follows it
   * (ScreenLocationBehavior, Figma 3870:5941) as `--dock-y`, while this is the
   * sheet on show: the same length, so both glide alike. At rest it is written
   * on the page's `[data-dock-host]`, for a follower that comes later to find;
   * a finger's move writes it on the followers alone (`[data-dock-follower]`),
   * since a property changed on the page's root restyles the whole page, and a
   * drag writes one each frame.
   */
  function at(y: string, isMove = false) {
    const sheet = own.current;
    if (!sheet) return;
    sheet.style.setProperty('--sheet-y', y);
    if (sheet.hidden) return;
    const host = sheet.closest<HTMLElement>('[data-dock-host]');
    if (!host) return;
    if (!isMove) host.style.setProperty('--dock-y', y);
    for (const follower of host.querySelectorAll<HTMLElement>('[data-dock-follower]'))
      follower.style.setProperty('--dock-y', y);
  }

  // Whether this sheet put the mark on the page: only it takes it off, so a
  // hidden sheet's change, or one unmounting, leaves another's drag alone.
  const markedRef = useRef(false);
  const restY = restAt(snap);
  useLayoutEffect(() => {
    if (!dragging) at(restY);
    // What follows the sheet on the page (the LocatorButton) glides with it,
    // or keeps up with the finger.
    const mark = dragging && !hidden;
    if (mark === markedRef.current) return;
    own.current?.closest('[data-dock-host]')?.toggleAttribute('data-dock-dragging', mark);
    markedRef.current = mark;
  }, [restY, dragging, hidden]);
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
  const show = (shown: number) => at(slideShowing(shown, shape), true);
  const { onPointerDown, onBodyFocus, afterTap, isStepUp } = useSheetGestures({
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
  });
  const handleLabel = handleLabelFor(snap, isStepUp(snap));

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
      data-footer={footer ? '' : undefined}
      data-low-px={shape.lowPx}
      data-max-full={shape.isMaxFull || undefined}
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
        aria-label={handleLabel}
        title={handleLabel}
        onClick={() => setSnap(afterTap(snap))}
        // HandleNotch: 8 above the bar, 4 below (Figma 3742:1049).
        className={cn(HANDLE[handle], 'shrink-0 touch-none justify-center sheet-floating:hidden')}
      >
        <span aria-hidden className="h-1.5 w-12 rounded-full bg-surface-quaternary" />
      </button>
      <div ref={headRef} className="shrink-0 touch-none sheet-floating:touch-auto">
        {header}
      </div>
      {footer && (
        <div
          data-testid="sheet-footer"
          data-sheet-footer
          className={
            'pointer-events-none absolute inset-x-0 bottom-(--sheet-y) z-10 pb-[env(safe-area-inset-bottom)] ' +
            '[&_[popover]]:pointer-events-auto [&_button]:pointer-events-auto ' +
            'sheet-floating:top-0 sheet-floating:bottom-auto sheet-floating:pb-0'
          }
        >
          {footer}
        </div>
      )}
      <div
        ref={bodyRef}
        onFocus={onBodyFocus}
        className={
          'min-h-0 flex-1 scrollbar-none sheet-floating:touch-auto sheet-floating:overflow-y-auto [&::-webkit-scrollbar]:hidden ' +
          (snap === 'full' ? 'overflow-y-auto' : 'touch-none overflow-hidden')
        }
        // At full height the sheet stands a gap down the map (sheetGesture), as much
        // of it under the screen's bottom: padded by that, its list scrolls to the end.
        style={snap === 'full' ? fullBodyStyle(shape) : undefined}
      >
        {fits ? <div ref={contentRef}>{children}</div> : children}
      </div>
    </div>
  );
}

/** The handle drawn, or kept for the keyboard alone (BottomSheet's `handle`). */
const HANDLE = {
  shown: 'flex w-full pt-2 pb-1',
  // Focused from the keyboard, it shows as the notch every other card draws: focus is always seen.
  hidden:
    'sr-only focus-visible:not-sr-only focus-visible:flex focus-visible:w-full focus-visible:pt-2 focus-visible:pb-1',
} satisfies Record<NonNullable<Props['handle']>, string>;

/**
 * The body at full height. A sheet leaving a strip of map stands that gap down the map, as much of
 * it under the screen's bottom: padded by that, its list scrolls to the end. A sheet filling the
 * screen runs behind the status bar instead: padded by it at the top, its first card clears it.
 */
function fullBodyStyle(shape: SheetShape): CSSProperties {
  return shape.isMaxFull
    ? { paddingTop: 'var(--map-safe-top)' }
    : { paddingBottom: 'calc(var(--map-safe-top) + ' + MAX_STRIP_PX + 'px)' };
}

/**
 * What a screen reader hears on the handle: the height the sheet is at, and which way Enter steps
 * it, a third of the map (stepFrom).
 */
function handleLabelFor(snap: Snap, isUp: boolean): string {
  const step = `${isUp ? 'Raise' : 'Lower'} it a third`;
  if (snap === 'low') return `Sheet lowered. ${step}`;
  if (snap === 'full') return `Sheet at full height. ${step}`;
  return `Sheet at ${Math.round(snap * 100)}% of the map. ${step}`;
}
