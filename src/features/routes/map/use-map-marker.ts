import { Marker, type MapLibreMap, type MarkerOptions } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import { tapsOnItsButton } from './marker-tap';

/**
 * A DOM marker's element, made once: the box MapLibre moves, with the test
 * id the suites read and the class its sheet styles; what the marker's
 * component portals into (HintuanPin, StationLabels, EndTitles, the
 * commuter's own dot).
 */
export function useMarkerElement(testid: string, className = ''): HTMLDivElement {
  const [el] = useState(() => {
    const div = document.createElement('div');
    div.className = className;
    div.dataset.testid = testid;
    return div;
  });
  return el;
}

interface MapMarkerOptions extends Omit<MarkerOptions, 'element'> {
  /**
   * A tap on a button inside the marker (marker-tap.ts), read as the tap
   * comes: the latest handler, bound once, so a fresh function each render
   * binds nothing anew.
   */
  onTap?: () => void;
  /** A press that moves still pans the map (marker-tap.ts's dragsPass). */
  dragsPass?: boolean;
}

/**
 * `el` as a marker on `map` at `at`: added once per map and moved after,
 * never made anew — a marker made anew pops what is inside it a second time
 * and jumps it from the point it had (the ds-reviewer's finding,
 * 2026-10-12) — its anchor and the rest of its options its own for its life.
 * One wiring for every marker of ours, where each had it word for word
 * until 2026-10-12.
 */
export function useMapMarker(
  map: MapLibreMap,
  el: HTMLElement,
  at: LngLat,
  { onTap, dragsPass = false, ...options }: MapMarkerOptions = {},
): void {
  const marker = useRef<Marker | null>(null);
  useEffect(() => {
    const m = new Marker({ ...options, element: el }).setLngLat(at).addTo(map);
    marker.current = m;
    return () => {
      m.remove();
      marker.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- made once per map, its options for its life; the effect below moves it
  }, [map, el]);
  useEffect(() => {
    marker.current?.setLngLat(at);
  }, [at]);
  const tap = useRef(onTap);
  useEffect(() => {
    tap.current = onTap;
  });
  useEffect(() => tapsOnItsButton(el, () => tap.current?.(), { dragsPass }), [el, dragsPass]);
}
