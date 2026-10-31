import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { applyBasemap, rememberBasemap, type Basemap } from './basemap';
import { readLocationLabels, rememberLocationLabels } from './location-labels';

/**
 * Which way the card opens from its button: down from the top-right corner
 * (BasemapControl), up from LocationAndMap, which sits on the card's sheet.
 */
export type MapStyleDirection = 'down' | 'up';

/** Closing is the card on its way out, still drawn while its leaving plays. */
type CardState = 'closed' | 'open' | 'closing';

/** Between the button and the card (gap-2), and kept clear past the card, as the corner's margin. */
const CARD_GAP_PX = 8;
const CARD_EDGE_PX = 10;

/**
 * Where a close goes: the card plays its leaving (map-style.css) before it
 * goes, unless the device asks for no motion; then at once, as there is no
 * animation to wait for.
 */
const afterClose = (): CardState =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'closed' : 'closing';

export interface MapStyleCard {
  /** The design the map shows now. */
  current: Basemap;
  /** Whether the basemap's own labels show (the card's Location Labels switch). */
  areLabelsShown: boolean;
  card: CardState;
  /** How tall the card may grow, in px, measured as it opens. */
  cardRoom: number | undefined;
  /** The button and its card: a tap outside it closes the card. */
  rootRef: RefObject<HTMLDivElement | null>;
  toggle: () => void;
  close: () => void;
  select: (basemap: Basemap) => void;
  /** The Location Labels switch: the basemap's labels shown or hidden, and remembered. */
  toggleLabels: () => void;
  /** The card's leaving is over: it goes. */
  letGo: () => void;
}

/**
 * The Map Style card's state and its ways out — ✕, Escape, a tap outside —
 * for whichever button opens it. The toggle is the root's
 * `aria-haspopup="dialog"` button, which MapStyleButton and the studio's
 * IconButton both are. A pick switches the map (`applyBasemap`) and is
 * remembered for the next visit, as is the Location Labels switch.
 */
export function useMapStyleCard(
  map: MapLibreMap | null,
  initial: Basemap | (() => Basemap),
  direction: MapStyleDirection,
): MapStyleCard {
  const [current, setCurrent] = useState<Basemap>(initial);
  // The one MapView built the map with: both read the one remembered.
  const [areLabelsShown, setAreLabelsShown] = useState(readLocationLabels);
  const [card, setCard] = useState<CardState>('closed');
  const [cardRoom, setCardRoom] = useState<number | undefined>(undefined);
  const isOpen = card === 'open';
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleButton = () =>
    rootRef.current?.querySelector<HTMLElement>('[aria-haspopup="dialog"]') ?? null;

  // The keyboard goes back where it was: on the button that opened the card.
  const close = () => {
    setCard(afterClose());
    toggleButton()?.focus();
  };

  // The card may grow to the map's edge and no further: the map clips what
  // is past it (MapLibre's overflow). Read as it opens, wherever the button
  // is then: under the open credits on a phone, or on the sheet, the top of
  // the pill. From the button, not the root: a card still leaving is in it.
  const open = () => {
    const button = toggleButton()?.getBoundingClientRect();
    const edges = map?.getContainer().getBoundingClientRect();
    const room =
      direction === 'down'
        ? edges && button && edges.bottom - button.bottom
        : edges && button && button.top - edges.top;
    setCardRoom(room === undefined ? undefined : room - CARD_GAP_PX - CARD_EDGE_PX);
    setCard('open');
  };

  // A tap anywhere but the card and its button closes the card, as a tap on
  // the map closes a card: on the LocatorButton beside it too. Focus stays
  // where the tap put it.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const inside =
        e.target instanceof Element
          ? e.target.closest('[role="dialog"], [aria-haspopup="dialog"]')
          : null;
      if (inside && rootRef.current?.contains(inside)) return;
      setCard(afterClose());
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Escape closes the card, as it closes a card (useEscape), and only the
  // card: heard first, on the way down, so the card under it stays open.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setCard(afterClose());
      toggleButton()?.focus();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const select = (b: Basemap) => {
    if (b.id === current.id || !map) return;
    setCurrent(b);
    rememberBasemap(b);
    applyBasemap(map, b, areLabelsShown);
  };

  const toggleLabels = () => {
    if (!map) return;
    const next = !areLabelsShown;
    setAreLabelsShown(next);
    rememberLocationLabels(next);
    applyBasemap(map, current, next);
  };

  return {
    current,
    areLabelsShown,
    card,
    cardRoom,
    rootRef,
    toggle: () => (isOpen ? close() : open()),
    close,
    select,
    toggleLabels,
    letGo: () => setCard('closed'),
  };
}
