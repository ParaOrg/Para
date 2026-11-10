import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { isZoomWheel, panStep, wheelPan, type PanPixels } from './wheel-navigation';

/** A computer's pointer: a mouse or a trackpad, where the wheel is Figma's. */
const FINE_POINTER = '(pointer: fine)';

/**
 * The studio map's wheel on a computer, as Figma's canvas (wheel-navigation.ts):
 * the wheel pans up and down and Shift+wheel left and right, gliding;
 * Ctrl/⌘+wheel and a pinch are left to MapLibre's own eased scroll zoom. A
 * touch screen keeps MapLibre's gestures, and the public map, which never
 * calls this, keeps scroll-to-zoom.
 */
export function useWheelNavigation(map: MapLibreMap | null): void {
  useEffect(() => {
    if (!map || !window.matchMedia(FINE_POINTER).matches) return;
    const container = map.getCanvasContainer();
    let remaining: PanPixels = { x: 0, y: 0 };
    let frame: number | null = null;

    const glide = () => {
      const { step, rest } = panStep(remaining);
      remaining = rest;
      map.panBy([step.x, step.y], { duration: 0 });
      frame = rest.x === 0 && rest.y === 0 ? null : requestAnimationFrame(glide);
    };

    const handleWheel = (event: WheelEvent) => {
      // Ctrl/⌘ or a pinch goes on to MapLibre's scroll zoom, on this same element.
      if (isZoomWheel(event)) return;
      // A pan is the studio's alone: MapLibre's zoom never hears it, nor the page scrolls.
      event.preventDefault();
      event.stopPropagation();
      const by = wheelPan(event, container.clientHeight);
      remaining = { x: remaining.x + by.x, y: remaining.y + by.y };
      frame ??= requestAnimationFrame(glide);
    };

    // Capturing, so it hears the wheel before MapLibre's own listener here does.
    container.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true });
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [map]);
}
