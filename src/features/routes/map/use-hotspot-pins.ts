import type { MapLibreMap, MapStyleImageMissingEvent } from 'maplibre-gl';
import { useEffect, type RefObject } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import { isPinImage, pinsOf } from './hotspot-pins';

// The pins' images and layer: not in the code every page opens with (hotspot-pin-images.ts).
const loadPinImages = retryingImport(() => import('./hotspot-pin-images'));

/**
 * The hotspots' pins on `map`, fetched once its boxes are drawn and added then,
 * leaving out the box `hidden` names (the one the studio is editing), and
 * their images given again whenever a basemap switch loses them.
 */
export function useHotspotPins(map: MapLibreMap | null, hidden: RefObject<string | null>): void {
  useEffect(() => {
    if (!map) return;
    let isGone = false;
    let addImages: ((map: MapLibreMap) => void) | null = null;
    const handleImageMissing = (event: MapStyleImageMissingEvent) => {
      if (isPinImage(event.id)) addImages?.(map);
    };
    map.on('styleimagemissing', handleImageMissing);
    loadPinImages()
      .then(({ addPinImages, addPinLayer }) => {
        if (isGone) return;
        addImages = addPinImages;
        addPinLayer(map, hidden.current === null ? undefined : pinsOf(hidden.current));
      })
      .catch((error: unknown) => {
        // Offline before the chunk came: zoomed out the dots show; zoomed in, the boxes alone.
        console.warn("The hotspots' pins could not be loaded; their dots stay.", error);
      });
    return () => {
      isGone = true;
      map.off('styleimagemissing', handleImageMissing);
    };
  }, [map, hidden]);
}
