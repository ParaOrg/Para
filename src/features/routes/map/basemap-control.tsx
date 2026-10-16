import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import { applyBasemap, rememberBasemap, type Basemap } from './basemap';
import { MapStyle } from './map-style';

interface BasemapControlProps {
  map: MapLibreMap;
  /** The designs the card offers, in order. */
  basemaps: readonly Basemap[];
  /** Each design's picture on the card, by its id. */
  thumbnails: Readonly<Record<string, string>>;
  /** The design the map was built with. */
  initial: Basemap;
  /** What MapLibre has in the top-right corner above it; the button rests under that. */
  under: Above;
}

/**
 * What can sit above the button: the attribution on a phone (it moves to the
 * top there), MapLibre's +, − and compass for a mouse in the studio, or, for
 * a mouse on the public map, nothing since the owner took those off
 * (2026-09-29) — then the button takes the corner itself.
 */
type Above = 'attribution' | 'zoom' | 'nothing';

/** Closing is the card on its way out, still drawn while its leaving plays. */
type CardState = 'closed' | 'open' | 'closing';

/**
 * Where a close goes: the card plays its leaving (map-style.css) before it
 * goes, unless the device asks for no motion; then at once, as there is no
 * animation to wait for.
 */
const afterClose = (): CardState =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'closed' : 'closing';

// Below the status bar on an installed iPhone: the map's own corner controls
// already sit inside the safe area (styles/index.css), and these follow them.
const TOP = {
  attribution: 'top-[calc(3rem+env(safe-area-inset-top))]',
  zoom: 'top-[calc(7.5rem+env(safe-area-inset-top))]',
  nothing: 'top-[calc(0.625rem+env(safe-area-inset-top))]',
} satisfies Record<Above, string>;

/**
 * The owner's "MayLayers or Theme" button (4176:10679, 2026-10-16) at the
 * top right, and under it his Map Style card (MapStyle) for the designs. It
 * draws nothing on the map itself — `applyBasemap` does the switch and
 * carries the routes and hotspots across — so both pages get it from
 * MapView for free.
 */
export function BasemapControl({ map, basemaps, thumbnails, initial, under }: BasemapControlProps) {
  const [current, setCurrent] = useState<Basemap>(initial);
  const [card, setCard] = useState<CardState>('closed');
  const isOpen = card === 'open';
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // The keyboard goes back where it was: on the button that opened the card.
  const close = () => {
    setCard(afterClose());
    buttonRef.current?.focus();
  };

  // A tap anywhere else closes the card, as a tap on the map closes a card.
  // Focus stays where the tap put it.
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setCard(afterClose());
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Escape closes the card, as it closes a card (useEscape), and only the
  // card: heard first, on the way down, so the card under it stays open
  // (review of 2026-10-03: the menu could not be closed from the keyboard).
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setCard(afterClose());
      buttonRef.current?.focus();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen]);

  const handleSelect = (b: Basemap) => {
    if (b.id === current.id) return;
    setCurrent(b);
    rememberBasemap(b);
    applyBasemap(map, b);
  };

  return (
    <div
      ref={rootRef}
      className={`absolute right-[calc(0.625rem+env(safe-area-inset-right))] z-10 flex flex-col items-end gap-2 ${TOP[under]}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? close() : setCard('open'))}
        aria-label="Map design"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={`Map design: ${current.label}`}
        data-testid="basemap"
        className={
          'group relative grid size-12 shrink-0 place-items-center rounded-full bg-surface-tertiary text-content-primary ' +
          'outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-brand-surface'
        }
      >
        <MapLayersIcon />
        {/* Figma's shadow lies over what the button holds, as on the LocatorButton. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full shadow-special-button-rest group-active:shadow-special-button-pressed"
        />
      </button>
      {card !== 'closed' && (
        <MapStyle
          basemaps={basemaps}
          selectedId={current.id}
          thumbnails={thumbnails}
          onSelect={handleSelect}
          isClosing={card === 'closing'}
          onClose={close}
          onClosed={() => setCard('closed')}
        />
      )}
    </div>
  );
}

/** Figma's `map-layers` (3751:1922): a folded map, 28 px in 10 around, in currentColor. */
function MapLayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-7">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.25 3.13465C7.25 2.80712 7.25 2.64335 7.13415 2.55327C7.1208 2.54289 7.10282 2.53138 7.08779 2.52362C6.95744 2.45621 6.81999 2.5197 6.54509 2.64666C6.08426 2.85949 5.55431 3.16692 4.90724 3.54231L3.6187 4.28979C3.15063 4.5613 2.75247 4.79225 2.44084 5.01728C2.10848 5.25727 1.82705 5.52278 1.61998 5.88626C1.4134 6.24887 1.32728 6.62751 1.28746 7.03781C1.24997 7.42418 1.24999 7.89052 1.25 8.44168V16.6807C1.24999 17.4098 1.24998 18.0127 1.29639 18.4842C1.34327 18.9603 1.44676 19.4386 1.75833 19.8251C2.09802 20.2466 2.57688 20.5331 3.11024 20.6283C3.60335 20.7163 4.0707 20.5683 4.5015 20.3738C4.92742 20.1816 5.49919 19.8499 6.11822 19.4907C6.40134 19.3265 6.6546 19.1796 6.89091 19.0575C7.07195 18.9639 7.16247 18.9172 7.20624 18.8453C7.25 18.7734 7.25 18.6788 7.25 18.4897V3.13465ZM8.75 18.361C8.75 18.5636 8.75 18.6649 8.7977 18.7391C8.84539 18.8132 8.94451 18.8584 9.14275 18.9487C9.36402 19.0495 9.6448 19.1875 10.0237 19.3759L13.8376 21.2723C14.0293 21.3677 14.25 21.2283 14.25 21.0141V5.25707C14.25 5.07622 14.25 4.9858 14.205 4.9132C14.16 4.8406 14.0791 4.80034 13.9171 4.71982L11.1426 3.34023C10.4737 3.00758 9.92553 2.73506 9.45232 2.55248C9.16027 2.4398 9.01425 2.38346 8.88544 2.46797C8.88226 2.47006 8.87831 2.47277 8.87522 2.47498C8.75 2.56474 8.75 2.73373 8.75 3.07172V18.361ZM15.9214 5.34585C15.8268 5.34585 15.75 5.42239 15.75 5.51692V21.6531C15.75 21.7136 15.799 21.7627 15.8595 21.7627H18.0529C18.9506 21.7627 19.7008 21.7627 20.2966 21.6808C20.9275 21.5942 21.4955 21.4033 21.9503 20.9384C22.4028 20.4759 22.5866 19.902 22.6704 19.2652C22.7501 18.6594 22.75 17.8955 22.75 16.9756V10.1329C22.75 9.21296 22.7501 8.44909 22.6704 7.84335C22.5866 7.20648 22.4028 6.63259 21.9503 6.17006C21.4955 5.70525 20.9275 5.51436 20.2966 5.42767C19.7008 5.34579 18.9506 5.34582 18.0529 5.34585H15.9214Z"
      />
    </svg>
  );
}
