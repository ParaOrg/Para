import type { MapLibreMap } from 'maplibre-gl';
import type { ReactNode } from 'react';

import { BASEMAPS, readBasemap } from '@/features/routes/map/basemap';
import { BASEMAP_THUMBNAILS } from '@/features/routes/map/basemap-thumbnails';
import { MapStyle } from '@/features/routes/map/map-style';
import { MapStyleButton } from '@/features/routes/map/map-style-button';
import { useMapStyleCard } from '@/features/routes/map/use-map-style-card';

import { LocationAndMap } from './location-and-map';

interface LocationAndMapControlProps {
  /** The map the top half switches the design of; null in a story, where a pick does nothing. */
  map: MapLibreMap | null;
  /** The map's 'load' is in and it has not failed: until then the top half is disabled. */
  isMapLoaded: boolean;
  /** The LocatorButton, the pill's bottom half. */
  children: ReactNode;
}

/**
 * LocationAndMap filled: the map-style button over the LocatorButton, and the
 * Map Style card, opening up from the pill, right-aligned with it: below it
 * is the sheet. A tap on the LocatorButton is outside the card and closes it.
 *
 * The designs are the public map's, BASEMAPS, as MapView opens on by default;
 * a page that hands MapView others would hand them here too.
 */
export function LocationAndMapControl({ map, isMapLoaded, children }: LocationAndMapControlProps) {
  const { current, card, cardRoom, rootRef, toggle, close, select, letGo } = useMapStyleCard(
    map,
    () => readBasemap(BASEMAPS),
    'up',
  );
  return (
    <div ref={rootRef} className="flex flex-col items-end gap-2">
      {card !== 'closed' && (
        <MapStyle
          basemaps={BASEMAPS}
          selectedId={current.id}
          thumbnails={BASEMAP_THUMBNAILS}
          maxHeight={cardRoom}
          direction="up"
          onSelect={select}
          isClosing={card === 'closing'}
          onClose={close}
          onClosed={letGo}
        />
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
