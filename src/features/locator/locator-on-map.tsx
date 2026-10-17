import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { useMapMarker, useMarkerElement } from '@/features/routes/map/use-map-marker';
import { metresPerPixel } from '@/shared/utils/geo';

import { useDotGaze, type Subject } from './dot-gaze';
import { LocatorIndicatorOverlay, haloFor } from './locator-indicator-overlay';
import type { Face, Mood } from './locator-mood';
import { circleRadius, indicatorScale, type Fix } from './use-locator';

interface LocatorOnMapProps {
  map: MapLibreMap;
  fix: Fix;
  heading: number | null;
  mood: Mood;
  face: Face;
  beat: number;
  /** What it gazes at, for a while after one is picked, and when a change is no pick (dot-gaze.ts). */
  gazeAt?: readonly Subject[];
  hushedAt?: { readonly current: number };
  /** A tap on the dot (locatorMood's `poke`). */
  onPoke: () => void;
}

/**
 * The overlay at the commuter's fix, as a DOM marker, not a map layer: it
 * costs the map nothing to move (an animated layer keeps MapLibre repainting
 * the whole map). It lies on the ground and turns with the map
 * (MapLibre's `map` alignments), as Google Maps' does: tilted, in the
 * compass view, the circle and the dot go oval with the street; and its
 * beam points the way they face, from north.
 */
export function LocatorOnMap({
  map,
  fix,
  heading,
  mood,
  face,
  beat,
  gazeAt = [],
  hushedAt,
  onPoke,
}: LocatorOnMapProps) {
  const el = useMarkerElement('locator-overlay');
  // The dot answers a tap itself, and the map beneath never hears the tap
  // (marker-tap.ts): no line opens, the camera stays. A drag that starts on
  // it still pans the map: it sits mid-screen, where a finger lands to pan.
  useMapMarker(map, el, fix.at, {
    anchor: 'center',
    pitchAlignment: 'map',
    rotationAlignment: 'map',
    onTap: onPoke,
    dragsPass: true,
  });
  const [zoom, setZoom] = useState(() => map.getZoom());
  useEffect(() => {
    const zoomed = () => setZoom(map.getZoom());
    map.on('zoom', zoomed);
    return () => {
      map.off('zoom', zoomed);
    };
  }, [map]);

  const gazeDeg = useDotGaze(fix.at, gazeAt, hushedAt);
  const haloPx = (2 * circleRadius(fix.accuracy)) / metresPerPixel(fix.at[1], zoom);
  const scale = indicatorScale(zoom);
  // For the suites (where-test): what the overlay was drawn from.
  useEffect(() => {
    el.setAttribute('data-accuracy-m', String(Math.round(fix.accuracy)));
    el.setAttribute('data-halo-px', String(haloFor(haloPx, scale)));
    el.setAttribute('data-scale', scale.toFixed(2));
    el.setAttribute('data-heading', heading === null ? '' : String(Math.round(heading)));
  }, [el, fix.accuracy, haloPx, heading, scale]);
  return createPortal(
    <LocatorIndicatorOverlay
      haloPx={haloPx}
      beamDeg={heading}
      scale={scale}
      mood={mood}
      face={face}
      beat={beat}
      gazeDeg={gazeDeg}
      pokeable
    />,
    el,
  );
}
