import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { wheelMove } from './wheel-navigation';

/** A computer's pointer: a mouse or a trackpad, where the wheel is Figma's. */
const FINE_POINTER = '(pointer: fine)';

/**
 * The studio map's wheel on a computer, as Figma's canvas (wheel-navigation.ts):
 * Ctrl/⌘+wheel or a pinch zooms about the pointer, the wheel pans up and
 * down, Shift+wheel left and right. MapLibre's own scroll-to-zoom is off
 * meanwhile, and back as it was when the studio lets the map go. A touch screen
 * keeps MapLibre's gestures, and the public map, which never calls this,
 * keeps scroll-to-zoom.
 */
export function useWheelNavigation(map: MapLibreMap | null): void {
  useEffect(() => {
    if (!map || !window.matchMedia(FINE_POINTER).matches) return;
    const container = map.getCanvasContainer();

    const handleWheel = (event: WheelEvent) => {
      // The page under the map must not scroll, nor the browser zoom on a pinch.
      event.preventDefault();
      const move = wheelMove(event, container.clientHeight);
      if (move.kind === 'pan') {
        map.panBy([move.x, move.y], { duration: 0 });
        return;
      }
      const box = container.getBoundingClientRect();
      const around = map.unproject([event.clientX - box.left, event.clientY - box.top]);
      map.easeTo({ zoom: map.getZoom() + move.by, around, duration: 0 });
    };

    const wasScrollZoomOn = map.scrollZoom.isEnabled();
    map.scrollZoom.disable();
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (wasScrollZoomOn) map.scrollZoom.enable();
    };
  }, [map]);
}
