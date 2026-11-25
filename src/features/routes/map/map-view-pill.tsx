import type { MapLibreMap } from 'maplibre-gl';
import { Suspense, useEffect } from 'react';

import { readBasemap, type Basemap } from './basemap';
import { LazyMapStyle, loadMapStyle } from './lazy-map-style';
import type { LabelsPlace } from './location-labels';
import { MapStyleButton } from './map-style-button';
import { useMapStyleCard } from './use-map-style-card';
import { useViewMode } from './use-view-mode';
import { ViewModeButton } from './view-mode-button';

interface MapViewPillProps {
  /** The map the pill switches the design and the view of; null until MapView hands it over. */
  map: MapLibreMap | null;
  /** The map's 'load' is in and it has not failed: until then the design button is disabled. */
  isMapLoaded: boolean;
  /** The designs the card offers, the ones MapView was handed. */
  basemaps: readonly Basemap[];
  /** Each design's picture on the card, by its id. */
  thumbnails: Readonly<Record<string, string>>;
  /** Whose Location Labels choice the card keeps. */
  labelsPlace: LabelsPlace;
}

/**
 * The public map's LocationAndMap at the top right (Figma 4885:44810): the map-style button
 * (`layers`) over the 2D/3D button, one 48 × 96 pill under shadow-sm, each half with its own
 * Special look and press. The Map Style card opens from it, down from the top right on a phone,
 * up where the pill stands over the LocatorButton (`@float:`, 4886:47571), right-aligned with it.
 * A tap on the 2D/3D button is outside the card and closes it.
 */
export function MapViewPill({
  map,
  isMapLoaded,
  basemaps,
  thumbnails,
  labelsPlace,
}: MapViewPillProps) {
  const view = useViewMode(map);
  // The design MapView opened on: both read the one remembered.
  const {
    current,
    areLabelsShown,
    card,
    cardRoom,
    direction,
    rootRef,
    toggle,
    close,
    select,
    toggleLabels,
    letGo,
  } = useMapStyleCard(map, () => readBasemap(basemaps), 'auto', labelsPlace);
  // The card's code, fetched once the map is up: off the opening, here by the first press.
  useEffect(() => {
    if (isMapLoaded) void loadMapStyle();
  }, [isMapLoaded]);
  const isUp = direction === 'up';
  return (
    <div
      ref={rootRef}
      data-testid="map-view-pill"
      className={'flex items-end gap-2 ' + (isUp ? 'flex-col-reverse' : 'flex-col')}
    >
      <div className="flex flex-col rounded-full shadow-sm">
        <MapStyleButton
          corners="top"
          currentLabel={current.label}
          onClick={toggle}
          disabled={!isMapLoaded}
          aria-expanded={card === 'open'}
          data-testid="basemap"
        />
        <ViewModeButton mode={view.mode} onToggle={view.toggle} corners="bottom" />
      </div>
      {card !== 'closed' && (
        <Suspense fallback={null}>
          <LazyMapStyle
            basemaps={basemaps}
            selectedId={current.id}
            thumbnails={thumbnails}
            maxHeight={cardRoom}
            direction={direction}
            onSelect={select}
            areLabelsShown={areLabelsShown}
            onLabelsToggle={toggleLabels}
            isClosing={card === 'closing'}
            onClose={close}
            onClosed={letGo}
          />
        </Suspense>
      )}
    </div>
  );
}
