import type { MapLibreMap } from 'maplibre-gl';
import type { ReactNode } from 'react';

import { readBasemap, type Basemap } from '@/features/routes/map/basemap';
import { MapStyle } from '@/features/routes/map/map-style';
import { MapStyleButton } from '@/features/routes/map/map-style-button';
import { useMapStyleCard } from '@/features/routes/map/use-map-style-card';

import { LocationAndMap } from './location-and-map';

interface LocationAndMapControlProps {
  /** The map the top half switches the design of; null in a story, where a pick does nothing. */
  map: MapLibreMap | null;
  /** The map's 'load' is in and it has not failed: until then the top half is disabled. */
  isMapLoaded: boolean;
  /** The designs the card offers, the ones MapView was handed: the public map's three, the studio's five. */
  basemaps: readonly Basemap[];
  /** Each design's picture on the card, by its id. */
  thumbnails: Readonly<Record<string, string>>;
  /** The locator's note, above the pill; hidden while the card is open, which takes its place. */
  note: ReactNode;
  /** The LocatorButton, the pill's bottom half. */
  children: ReactNode;
}

/**
 * LocationAndMap filled: the map-style button over the LocatorButton, and the
 * Map Style card, opening up from the pill, right-aligned with it: below it
 * is the sheet. A tap on the LocatorButton is outside the card and closes it.
 */
export function LocationAndMapControl({
  map,
  isMapLoaded,
  basemaps,
  thumbnails,
  note,
  children,
}: LocationAndMapControlProps) {
  // The design MapView opened on: both read the one remembered.
  const { current, card, cardRoom, rootRef, toggle, close, select, letGo } = useMapStyleCard(
    map,
    () => readBasemap(basemaps),
    'up',
  );
  return (
    <div ref={rootRef} className="flex flex-col items-end gap-1">
      {card === 'closed' && note}
      {card !== 'closed' && (
        // 8 above the pill (CARD_GAP_PX), where the note keeps 4.
        <div className="mb-1">
          <MapStyle
            basemaps={basemaps}
            selectedId={current.id}
            thumbnails={thumbnails}
            maxHeight={cardRoom}
            direction="up"
            onSelect={select}
            isClosing={card === 'closing'}
            onClose={close}
            onClosed={letGo}
          />
        </div>
      )}
      <LocationAndMap>
        <MapStyleButton
          corners="top"
          currentLabel={current.label}
          onClick={toggle}
          disabled={!isMapLoaded}
          aria-expanded={card === 'open'}
          data-testid="basemap"
        />
        {children}
      </LocationAndMap>
    </div>
  );
}
