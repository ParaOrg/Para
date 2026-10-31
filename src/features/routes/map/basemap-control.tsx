import type { IControl, MapLibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { IconButton } from '@/design-system/primitives/icon-button';

import type { Basemap } from './basemap';
import { MapStyle } from './map-style';
import { MapStyleButton } from './map-style-button';
import { MapTypeIcon } from './map-type-icon';
import { useMapStyleCard } from './use-map-style-card';

/** The studio's round 48 px button, or Figma's 40 px IconButton at 16 px from the corner. */
export type MapButtonStyle = 'round' | 'icon-button';

export const CORNER_MARGIN = {
  round: 'mt-2.5 mr-2.5',
  'icon-button': 'mt-4 mr-4',
} satisfies Record<MapButtonStyle, string>;

interface BasemapControlProps {
  map: MapLibreMap;
  /** The designs the card offers, in order. */
  basemaps: readonly Basemap[];
  /** Each design's picture on the card, by its id. */
  thumbnails: Readonly<Record<string, string>>;
  /** The design the map was built with. */
  initial: Basemap;
  /** Which button opens the card. */
  buttonStyle?: MapButtonStyle;
}

/**
 * The button as one of MapLibre's own top-right controls, so MapLibre stacks
 * it under whatever is above it there, at its real height: the credits on a
 * phone, three lines tall once ⓘ opens them, until a drag folds them,
 * MapLibre's +, − and compass for a mouse in the studio, or nothing on the
 * public map's desktop, where it takes the corner. The corner keeps inside
 * the safe area itself (global.css). React draws into it, as the hintuan pins
 * do into their markers.
 */
export function useTopRightControl(map: MapLibreMap, margin = CORNER_MARGIN.round): HTMLElement {
  const [element] = useState(() => {
    const div = document.createElement('div');
    // Placed as MapLibre places a .maplibregl-ctrl in the corner, without
    // the class: its button rules (a grey hover) would paint over ours.
    div.className = `pointer-events-auto float-right clear-both ${margin}`;
    return div;
  });
  useEffect(() => {
    const control: IControl = { onAdd: () => element, onRemove: () => element.remove() };
    map.addControl(control, 'top-right');
    return () => {
      // Gone with the map already, when the map goes first.
      if (map.hasControl(control)) map.removeControl(control);
    };
  }, [map, element]);
  return element;
}

/**
 * The "MayLayers or Theme" button (Figma 4176:10679) at the top right, and
 * under it the Map Style card (MapStyle) for the designs. It draws nothing on
 * the map itself — `applyBasemap` does the switch and carries the routes and
 * hotspots across — so both pages get it from MapView for free.
 */
export function BasemapControl({
  map,
  basemaps,
  thumbnails,
  initial,
  buttonStyle = 'round',
}: BasemapControlProps) {
  const corner = useTopRightControl(map, CORNER_MARGIN[buttonStyle]);
  const {
    current,
    areLabelsShown,
    card,
    cardRoom,
    rootRef,
    toggle,
    close,
    select,
    toggleLabels,
    letGo,
  } = useMapStyleCard(map, initial, 'down');
  const isOpen = card === 'open';

  return createPortal(
    <div ref={rootRef} className="flex flex-col items-end gap-2">
      {buttonStyle === 'icon-button' ? (
        <IconButton
          tooltip="left"
          label="Map design"
          icon={<MapTypeIcon />}
          onClick={toggle}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          data-testid="basemap"
        />
      ) : (
        <MapStyleButton
          currentLabel={current.label}
          onClick={toggle}
          aria-expanded={isOpen}
          data-testid="basemap"
        />
      )}
      {card !== 'closed' && (
        <MapStyle
          basemaps={basemaps}
          selectedId={current.id}
          thumbnails={thumbnails}
          maxHeight={cardRoom}
          onSelect={select}
          areLabelsShown={areLabelsShown}
          onLabelsToggle={toggleLabels}
          isClosing={card === 'closing'}
          onClose={close}
          onClosed={letGo}
        />
      )}
    </div>,
    corner,
  );
}
