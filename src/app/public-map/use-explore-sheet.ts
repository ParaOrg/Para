import {
  useLayoutEffect,
  useState,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import { ROUTE_SHEET_SHAPE } from '@/features/routes/cards/route-sheet-shape';
import { DRAG_PX, follow, swallowTheTapsClick, twoRestFor } from '@/shared/ui/sheet-gesture';

/** Where the explore cards rest: open, both cards whole, or Low, as a route's sheet shows it. */
export type ExploreRest = 'open' | 'low';

interface ExploreSheet {
  rest: ExploreRest;
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

/** Whether `cards` lie along the map's bottom, as wide as it: a phone's layout, not floating. */
function isAlongBottom(cards: HTMLElement, host: HTMLElement) {
  return cards.offsetWidth >= host.clientWidth;
}

/** The cards slid `y` down, the foot `foot` tall: on the host at rest, and on what follows. */
function place(
  cards: HTMLElement,
  host: HTMLElement,
  y: string,
  foot: string | null,
  isMove = false,
) {
  cards.style.setProperty('--explore-y', y);
  const followers = [...host.querySelectorAll<HTMLElement>('[data-dock-follower]')];
  for (const el of isMove ? followers : [host, ...followers]) {
    if (foot === null) el.style.removeProperty('--dock-foot');
    else el.style.setProperty('--dock-foot', foot);
  }
}

/**
 * The explore cards as a sheet with two rests (Figma FirstCard, 4885:40725 and 4885:41191; the
 * owner, 2026-11-25): they open whole, and a drag takes them to Low 80 or back, never resting
 * between (twoRestFor). They never close and nothing in them scrolls. Along the bottom they are
 * the foot the locate-me column stands on (`--dock-foot`, locator.tsx), at rest and as a finger
 * moves them; floating in the corner they are still and leave the foot alone.
 */
export function useExploreSheet(own: RefObject<HTMLDivElement | null>): ExploreSheet {
  const [rest, setRest] = useState<ExploreRest>('open');
  const [isDragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const cards = own.current;
    const host = cards?.closest<HTMLElement>('[data-dock-host]');
    if (!cards || !host || isDragging) return;
    const settle = () => {
      if (!isAlongBottom(cards, host)) place(cards, host, '0px', null);
      else if (rest === 'open') place(cards, host, '0px', `${cards.offsetHeight}px`);
      else place(cards, host, LOW_Y, LOW_FOOT);
    };
    settle();
    const watch = new ResizeObserver(settle);
    watch.observe(cards);
    watch.observe(host);
    return () => watch.disconnect();
  }, [own, rest, isDragging]);

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
      place(cards, host, `${openPx - shown}px`, `${shown}px`, true);
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
    isDragging,
    toggle: () => setRest((r) => (r === 'open' ? 'low' : 'open')),
    onPointerDown,
    onFocus,
  };
}
