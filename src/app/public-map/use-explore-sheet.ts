import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { ROUTE_SHEET_SHAPE } from '@/features/routes/cards/route-sheet-shape';
import { DRAG_PX, follow, swallowTheTapsClick, type Snap } from '@/shared/ui/sheet-gesture';
import { twoRestFor } from '@/shared/ui/two-rest';

import { followersOf, isAlongBottom, place } from './explore-sheet-place';

/** Where the explore cards rest: open, both cards whole, or Low, as a route's sheet shows it. */
export type ExploreRest = 'open' | 'low';

interface ExploreSheet {
  rest: ExploreRest;
  /** Where they are first drawn: their rest from the start, so they never glide to it. */
  opensAt: CSSProperties;
  /** On while a finger or a mouse holds the cards: they follow it, no glide. */
  isDragging: boolean;
  /** The keyboard's way: open to Low and back. */
  toggle: () => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** Focus from the keyboard on what Low hides opens the cards, so it is seen. */
  onFocus: (e: FocusEvent<HTMLDivElement>) => void;
}

const LOW_PX = ROUTE_SHEET_SHAPE.lowPx;
/** Low's slide and its foot: 80 above a phone's home bar, as the route sheets' Low. */
const LOW_Y = `calc(100% - ${LOW_PX}px - env(safe-area-inset-bottom))`;
const LOW_FOOT = `calc(${LOW_PX}px + env(safe-area-inset-bottom))`;

/**
 * The explore cards as a sheet with two rests (Figma FirstCard, 4885:40725 and 4885:41191; the
 * owner, 2026-11-25): they open whole, and a drag takes them to Low 80 or back, never resting
 * between (twoRestFor). They never close and nothing in them scrolls. Along the bottom they are
 * the foot the locate-me column stands on (`--dock-foot`, locator.tsx), at rest and as a finger
 * moves them; floating in the corner they are still and leave the foot alone. Where they rest goes
 * to `onRest` as the height a sheet opening over them takes: open, theirs as a share of the map;
 * at Low or floating, Low. They start where the page says (`startsAt`): whole on a first visit, at
 * Low as a card closes (the owner, 2026-11-26).
 */
export function useExploreSheet(
  own: RefObject<HTMLDivElement | null>,
  onRest?: (snap: Snap, rest: ExploreRest) => void,
  startsAt: ExploreRest = 'open',
): ExploreSheet {
  const [rest, setRest] = useState<ExploreRest>(startsAt);
  // Never changed after: the moves write --explore-y themselves (place). Without it they would be
  // drawn whole as the layout effect below measures them, and glide from there down to Low.
  const [opensAt] = useState<CSSProperties>(() => ({
    '--explore-y': startsAt === 'low' ? LOW_Y : '0px',
  }));
  const [isDragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const cards = own.current;
    const host = cards?.closest<HTMLElement>('[data-dock-host]');
    if (!cards || !host || isDragging) return;
    const settle = () => {
      const isOpen = isAlongBottom(cards, host) && rest === 'open';
      if (!isAlongBottom(cards, host)) place(cards, host, '0px', null);
      else if (isOpen) place(cards, host, '0px', `${cards.offsetHeight}px`);
      else place(cards, host, LOW_Y, LOW_FOOT);
      onRest?.(
        isOpen && host.clientHeight > 0 ? cards.offsetHeight / host.clientHeight : 'low',
        rest,
      );
    };
    settle();
    const watch = new ResizeObserver(settle);
    watch.observe(cards);
    watch.observe(host);
    return () => watch.disconnect();
  }, [own, rest, isDragging, onRest]);

  // Gone (a card opened over the map): the foot goes with them.
  useLayoutEffect(() => {
    const host = own.current?.closest<HTMLElement>('[data-dock-host]');
    return () => {
      if (!host) return;
      for (const el of [host, ...host.querySelectorAll<HTMLElement>('[data-dock-follower]')])
        el.style.removeProperty('--dock-foot');
    };
  }, [own]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cards = own.current;
    const host = cards?.closest<HTMLElement>('[data-dock-host]');
    if (!cards || !host || !e.isPrimary || e.button !== 0 || !isAlongBottom(cards, host)) return;
    const openPx = cards.offsetHeight;
    const from = host.getBoundingClientRect().bottom - cards.getBoundingClientRect().top;
    const heights = { low: Math.min(from, LOW_PX), full: openPx };
    const track = follow(e.clientY, e.timeStamp, from, host.clientHeight, heights);
    // Read once, not on every move: a drag writes styles, never reads the page.
    const followers = followersOf(host);
    const id = e.pointerId;
    const startY = e.clientY;
    let isHeld = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!isHeld) {
        if (Math.abs(ev.clientY - startY) < DRAG_PX) return;
        isHeld = true;
        setDragging(true);
        host.toggleAttribute('data-dock-dragging', true);
      }
      const shown = track.move(ev.clientY, ev.timeStamp);
      place(cards, host, `${openPx - shown}px`, `${shown}px`, followers, true);
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!isHeld) return;
      const { shown, velocity } = track.lift(ev.timeStamp, ev.clientY);
      setRest(twoRestFor(shown, velocity, heights) === 'full' ? 'open' : 'low');
      setDragging(false);
      host.toggleAttribute('data-dock-dragging', false);
      swallowTheTapsClick(ev.clientX, ev.clientY);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (
      rest === 'low' &&
      !e.target.hasAttribute('data-explore-toggle') &&
      e.target.matches(':focus-visible')
    )
      setRest('open');
  };

  return {
    rest,
    opensAt,
    isDragging,
    toggle: () => setRest((r) => (r === 'open' ? 'low' : 'open')),
    onPointerDown,
    onFocus,
  };
}
